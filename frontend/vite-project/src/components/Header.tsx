import { useState } from 'react';
import { Link } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-solid shadow-md border-[#f0f1f5] dark:border-[#3a3f4a] bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 sm:px-6 md:px-20 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl font-extrabold text-primary">description</span>
          <h2 className="text-xl font-extrabold tracking-tight">DeepRead</h2>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a className="text-sm font-semibold hover:text-primary transition-colors" href="#">
            Documentation
          </a>
          <a className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1" href="#">
            GitHub
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
          <DarkModeToggle />

          {/* Clerk Auth Buttons */}
          <SignedOut>
            <SignInButton>
              <button className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <DarkModeToggle />
          {/* Mobile Auth Buttons */}
          <SignedOut>
            <SignInButton>
              <button className="w-full py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            ) : (
              <Bars3Icon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-2 flex flex-col gap-2 px-4 pb-4">
          <a className="text-sm font-semibold hover:text-primary transition-colors" href="#">
            Documentation
          </a>
          <a className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1" href="#">
            GitHub
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>

          
        </div>
      )}
    </header>
  );
};

export default Header;
