import Image from "next/image";
import Link from "next/link";
import LaunchButton from "../ar/LaunchButton";

export default function Hero() {
  return (
    <section className="container py-20 lg:py-32">

      <div className="grid lg:grid-cols-2 gap-16 items-center">

        {/* Left */}

        <div>

          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            🚀 WebXR Powered Interior Visualization
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight lg:text-7xl">
            Visualize your future space,
            <br />
            before you spend a dollar.
          </h1>

          <p className="mt-8 max-w-xl text-lg text-gray-600 leading-8">
            Instantly place life-size furniture into your room using your
            phone&apos; camera. No downloads. No apps. Just open your browser and
            start designing.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <LaunchButton />

            <Link
              href="/catalog"
              className="rounded-full border border-gray-300 px-8 py-4 font-semibold hover:bg-gray-100 transition"
            >
              Browse Collection
            </Link>

          </div>

          <p className="mt-10 text-sm text-gray-500">
            Trusted by interior designers, homeowners and furniture brands.
          </p>

        </div>

        {/* Right */}

        <div className="relative">

          <div className="overflow-hidden rounded-3xl border border-gray-200 shadow-xl">

            <Image
              src="/images/hero/living-room.jpg"
              alt="Modern Living Room"
              width={900}
              height={700}
              className="w-full h-auto"
              priority
            />

          </div>

        </div>

      </div>

    </section>
  );
}