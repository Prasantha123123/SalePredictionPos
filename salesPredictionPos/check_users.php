<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== USER LIST ===\n";
foreach (App\Models\User::all() as $u) {
    $roles = implode(', ', $u->getRoleNames()->toArray());
    echo "ID: {$u->id} | Email: {$u->email} | Active: " . ($u->is_active ? 'YES' : 'NO') . " | Roles: [{$roles}]\n";
}

// Reset or create cashier user
$cashier = App\Models\User::where('email', 'cashier@smartpos.lk')->first();
if ($cashier) {
    $cashier->password = bcrypt('password');
    $cashier->is_active = true;
    $cashier->save();
    if (!$cashier->hasRole('Cashier')) {
        $cashier->assignRole('Cashier');
    }
    echo "\n✅ Cashier user (cashier@smartpos.lk) password reset to 'password' and activated.\n";
} else {
    $cashier = App\Models\User::create([
        'name' => 'Saman Fernando',
        'email' => 'cashier@smartpos.lk',
        'password' => bcrypt('password'),
        'phone' => '+94774567890',
        'is_active' => true,
    ]);
    $cashier->assignRole('Cashier');
    echo "\n✅ Cashier user created: cashier@smartpos.lk / password\n";
}
