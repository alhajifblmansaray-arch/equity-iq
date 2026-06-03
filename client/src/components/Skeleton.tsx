export default function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="card animate-fadeUp">
        <div className="skel h-4 w-24 mb-4" />
        <div className="skel h-16 w-64 mb-3" />
        <div className="skel h-4 w-32 mb-6" />
        <div className="hairline-divider mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="skel h-3 w-16 mb-2" />
              <div className="skel h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="card animate-fadeUp animate-delay-1">
        <div className="skel h-4 w-32 mb-4" />
        <div className="skel h-72 w-full" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card animate-fadeUp animate-delay-2">
          <div className="skel h-4 w-28 mb-4" />
          <div className="skel h-40 w-full" />
        </div>
        <div className="card animate-fadeUp animate-delay-3">
          <div className="skel h-4 w-28 mb-4" />
          <div className="skel h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
