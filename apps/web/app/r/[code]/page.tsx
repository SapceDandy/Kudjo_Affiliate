export default function CouponLanding({ params }: { params: { code: string } }) {
  return (
    <main className="p-6 space-y-2">
      <h2 className="text-xl font-semibold">Coupon Code</h2>
      <p className="text-gray-600">Present this code to the cashier: <span className="font-mono">{params.code}</span></p>
    </main>
  );
} 