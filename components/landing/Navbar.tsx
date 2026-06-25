import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">

        {/* Logo */}

        <Link
          href="/"
          className="text-2xl font-bold tracking-tight"
        >
          Space<span className="text-blue-600">XR</span>
        </Link>

        {/* Desktop Navigation */}

        <nav className="hidden md:flex items-center gap-10">

          <Link
            href="/catalog"
            className="text-sm font-medium text-gray-600 hover:text-black transition"
          >
            Products
          </Link>

          <Link
            href="/categories"
            className="text-sm font-medium text-gray-600 hover:text-black transition"
          >
            Categories
          </Link>

          <Link
            href="/about"
            className="text-sm font-medium text-gray-600 hover:text-black transition"
          >
            About
          </Link>

          <Link
            href="/contact"
            className="text-sm font-medium text-gray-600 hover:text-black transition"
          >
            Contact
          </Link>

        </nav>

        {/* CTA */}

        

        <Link
          href="/catalog"
          className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Launch AR
        </Link>

      </div>
    </header>
  );
}