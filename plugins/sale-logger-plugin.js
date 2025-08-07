module.exports = {
  name: 'Sale Logger',
  initialize: (api) => {
    console.log('Initializing Sale Logger Plugin...');
    api.events.on('after:sale-finalize', (saleData) => {
      console.log('--- [Sale Logger Plugin] ---');
      console.log(`New sale completed! ID: ${saleData.saleId}`);
      console.log(`Total Amount: $${saleData.totalAmount.toFixed(2)}`);
      console.log('Items Sold:');
      saleData.cartItems.forEach(item => {
        console.log(`  - ${item.name} (x${item.quantity})`);
      });
      console.log('----------------------------');
    });
  },
};
