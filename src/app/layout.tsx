import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marvvy — AI Agent',
  description: 'Omnichannel AI Agent — Veteran CRM, Operations & Consulting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white antialiased">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-xl z-40 hidden lg:flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-lg font-bold shadow-lg shadow-violet-500/25">
                M
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">Marvvy</h1>
                <p className="text-xs text-white/40">AI Agent</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavItem href="/" icon="💬" label="Chat" active />
            <NavItem href="/crm" icon="👥" label="CRM" />
            <NavItem href="/ops" icon="⚙️" label="Operations" />
            <NavItem href="/consulting" icon="📊" label="Consulting" />
            <NavItem href="/admin" icon="🔧" label="Admin" />
            <NavItem href="/admin/settings" icon="⚙️" label="Settings" />
            <NavItem href="/admin/documents" icon="📚" label="Knowledge Base" />
          </nav>
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              All channels online
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl z-40 flex items-center px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
              M
            </div>
            <span className="font-bold">Marvvy</span>
          </div>
        </header>

        {/* Main content */}
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  );
}
