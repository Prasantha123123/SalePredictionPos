<?php

namespace App\Console\Commands;

use App\Models\Sale;
use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixHistoricalSalesDiscounts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sales:fix-discounts {--dry-run : Preview affected records without committing changes} {--apply : Apply the corrections to the database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Finds and corrects historical sales rows where total does not reflect discount_amount';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isDryRun = !$this->option('apply') || $this->option('dry-run');

        $this->info($isDryRun ? '--- DRY-RUN MODE (No database changes will be made) ---' : '--- APPLYING CORRECTIONS TO DATABASE ---');

        $sales = Sale::all();
        $affected = [];

        foreach ($sales as $sale) {
            $subtotal = (float) $sale->subtotal;
            $discount = (float) $sale->discount_amount;
            $tax = (float) $sale->tax_amount;
            $currentTotal = (float) $sale->total;

            $expectedTotal = round(max(0, $subtotal - $discount + $tax), 2);
            $discrepancy = round(abs($currentTotal - $expectedTotal), 2);

            if ($discrepancy > 1.0) {
                $affected[] = [
                    'id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'created_at' => $sale->created_at->format('Y-m-d H:i:s'),
                    'subtotal' => $subtotal,
                    'discount_amount' => $discount,
                    'tax_amount' => $tax,
                    'current_total' => $currentTotal,
                    'expected_total' => $expectedTotal,
                    'discrepancy' => $discrepancy,
                    'model' => $sale,
                ];
            }
        }

        if (empty($affected)) {
            $this->info('No sales found with discount/total discrepancies. All records are accurate!');
            return Command::SUCCESS;
        }

        $this->table(
            ['ID', 'Invoice Number', 'Date', 'Subtotal', 'Discount', 'Tax', 'Current Total', 'Corrected Total', 'Discrepancy'],
            array_map(fn ($item) => [
                $item['id'],
                $item['invoice_number'],
                substr($item['created_at'], 0, 10),
                number_format($item['subtotal'], 2),
                number_format($item['discount_amount'], 2),
                number_format($item['tax_amount'], 2),
                number_format($item['current_total'], 2),
                number_format($item['expected_total'], 2),
                number_format($item['discrepancy'], 2),
            ], $affected)
        );

        $this->info(sprintf('Total affected records found: %d', count($affected)));

        if ($isDryRun) {
            $this->warn("\nTo apply these fixes, run: php artisan sales:fix-discounts --apply");
            return Command::SUCCESS;
        }

        // Apply fixes within a database transaction
        DB::transaction(function () use ($affected) {
            foreach ($affected as $item) {
                $sale = $item['model'];
                $oldTotal = $sale->total;
                $newTotal = $item['expected_total'];

                $sale->update(['total' => $newTotal]);

                // Also update corresponding single payment record if it matched old total
                Payment::where('sale_id', $sale->id)
                    ->where('amount', $oldTotal)
                    ->update(['amount' => $newTotal]);
            }
        });

        $this->info(sprintf('Successfully corrected %d sales records in the database.', count($affected)));
        return Command::SUCCESS;
    }
}
