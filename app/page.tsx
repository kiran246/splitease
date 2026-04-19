import Link from 'next/link';

const features = [
  { icon: '👥', title: 'Group Expense Tracking', desc: 'Create sheets for trips, dinners, or any event. Everyone in one place.' },
  { icon: '✂️', title: 'Flexible Splitting', desc: 'Equal split in one click, or assign custom percentages per person.' },
  { icon: '🧮', title: 'Smart Settlements', desc: 'Our algorithm minimises transfers — see exactly who pays whom.' },
  { icon: '📤', title: 'Share Instantly', desc: 'Send the summary by email or WhatsApp. PDF download included.' },
  { icon: '💳', title: 'Pay with Stripe', desc: "Settle debts straight from the app. No more 'I'll get you later'." },
  { icon: '📊', title: 'Import from CSV', desc: 'Already tracking in Google Sheets? Import with one click.' },
];

const steps = [
  { n: '01', title: 'Create a sheet', desc: 'Name your group and add everyone who\'s splitting the bill.' },
  { n: '02', title: 'Log expenses', desc: 'Add each transaction, who paid, and how to split it.' },
  { n: '03', title: 'Settle up', desc: 'See the final balances and pay directly through the app.' },
];

const testimonials = [
  { quote: 'Finally no more spreadsheet chaos after every trip!', name: 'Ananya M.', role: 'Frequent traveller' },
  { quote: 'We used this for our flat — everyone knew exactly what they owed.', name: 'Rohan K.', role: 'Student' },
  { quote: 'The WhatsApp share is genius. One tap and the whole group is updated.', name: 'Priya S.', role: 'Event organiser' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-white font-extrabold text-sm">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight">SplitEase</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#how" className="hover:text-indigo-600 transition">How it works</a>
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#testimonials" className="hover:text-indigo-600 transition">Reviews</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition hidden sm:block">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 shadow shadow-indigo-200 transition"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0e7ff_1px,transparent_1px),linear-gradient(to_bottom,#e0e7ff_1px,transparent_1px)] bg-[size:48px_48px] opacity-30 pointer-events-none" />
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse inline-block" />
            Split smarter, not harder
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            No more awkward<br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              money conversations
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-light">
            Track shared expenses, split costs fairly, and settle up instantly — for trips, dinners, flatmates, and more.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold text-base rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Start for free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 font-semibold text-base rounded-2xl border border-gray-200 hover:bg-gray-50 shadow-sm transition"
            >
              Sign in to your account
            </Link>
          </div>

          <p className="text-sm text-gray-400">Free forever · No credit card required</p>

          {/* Hero mock card */}
          <div className="mt-12 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 text-left space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Goa Trip 2025</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-0.5">$420.00</p>
              </div>
              <div className="flex -space-x-2">
                {['AL','BO','CH','DA'].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white">{i}</div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Hotel', amount: '$200', by: 'Alice' },
                { name: 'Dinner', amount: '$120', by: 'Bob' },
                { name: 'Taxi', amount: '$100', by: 'Charlie' },
              ].map((t) => (
                <div key={t.name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">paid by {t.by}</span>
                    <span className="text-sm font-bold text-gray-900">{t.amount}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-700">💡 Settlement</p>
              <p className="text-sm text-gray-700 mt-0.5">Bob pays Alice <span className="font-bold">$35.00</span></p>
              <p className="text-sm text-gray-700">Dave pays Alice <span className="font-bold">$70.00</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logos / trust strip ─────────────────────────────────────────── */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Powered by trusted technology</p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-400 font-semibold text-sm">
            {['Next.js', 'Prisma', 'Stripe', 'NextAuth', 'Tailwind CSS'].map((t) => (
              <span key={t} className="opacity-60 hover:opacity-100 transition">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest">How it works</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Three steps to zero stress</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition space-y-4">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-10 -right-3 z-10 text-gray-300 text-xl">→</div>
                )}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <span className="text-white font-extrabold text-sm">{s.n}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest">Features</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Everything your group needs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Built for real people, not accountants.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 space-y-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative text-4xl">{f.icon}</div>
                <h3 className="relative font-bold text-gray-900 text-base">{f.title}</h3>
                <p className="relative text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-widest">Testimonials</p>
            <h2 className="text-4xl font-extrabold text-gray-900">People love SplitEase</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-3xl p-7 border border-gray-100 shadow-sm space-y-4">
                <div className="flex gap-1 text-amber-400 text-sm">{'★★★★★'}</div>
                <p className="text-gray-700 text-sm leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
            Ready to stop chasing people<br />for money?
          </h2>
          <p className="text-indigo-200 text-lg">
            Join thousands of groups who split smarter with SplitEase.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-indigo-700 font-extrabold text-base rounded-2xl hover:bg-indigo-50 shadow-2xl transition hover:-translate-y-0.5"
          >
            Create your first sheet — it&apos;s free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
          <p className="text-indigo-300 text-sm">No credit card · Free forever</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <span className="text-white font-bold">SplitEase</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs">The simplest way to split expenses with any group.</p>
            </div>
            <div className="flex gap-8 text-sm">
              <div className="space-y-2">
                <p className="text-white font-semibold text-xs uppercase tracking-wide mb-3">Product</p>
                <Link href="/register" className="block hover:text-white transition">Get started</Link>
                <Link href="/login" className="block hover:text-white transition">Sign in</Link>
              </div>
              <div className="space-y-2">
                <p className="text-white font-semibold text-xs uppercase tracking-wide mb-3">Learn</p>
                <a href="#how" className="block hover:text-white transition">How it works</a>
                <a href="#features" className="block hover:text-white transition">Features</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-600">
            <p>© 2026 SplitEase. All rights reserved.</p>
            <p>Built with ♥ for groups everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
