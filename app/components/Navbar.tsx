'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';




export function Navbar() {
  const currentPath = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokens, setTokens] = useState<number>(0);
  const [isApiEnabled, setIsApiEnabled] = useState(false);


  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      setTokens(data.tokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    console.log(storedUser);
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setIsAdmin(userData.is_admin);
      setIsApiEnabled(userData.is_api_enabled);
    }
    const fetchTokens = async () => {
      try {
        const tokensResponse = await fetch('/api/tokens');
        const tokensData = await tokensResponse.json();
        setTokens(tokensData.tokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
    };
    fetchTokens();
  }, []);


  const activeClassName =
    'border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium';
  const inactiveClassName =
    'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium';

  const mobileActiveClassName =
    'bg-blue-100 text-blue-600 inline-flex items-center justify-center w-full px-3 py-2 rounded-md text-sm font-medium';
  const mobileInactiveClassName =
    'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 inline-flex items-center justify-center w-full px-3 py-2 rounded-md text-sm font-medium';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
        if (!response.ok) {
        throw new Error('Failed to logout');
      }
      localStorage.removeItem('user');
        
      setIsAdmin(false);
      setTokens(0);
        
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    };
  };


  const handleMobileLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm fixed top-0 w-full z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo and navigation links */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Image src="/Logo-1.png" alt="Logo" width={150} height={150} />
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/templates"
                className={
                  currentPath === '/templates' ? activeClassName : inactiveClassName
                }
              >
                Templates
              </Link>
              <Link
                href="/generate"
                className={
                  currentPath === '/generate' ? activeClassName : inactiveClassName
                }
              >
                Generate
              </Link>
              <Link
                href="/email"
                className={
                  currentPath === '/email' ? activeClassName : inactiveClassName
                }
              >
                Email
              </Link>
              <Link
                href="/analytics"
                className={
                  currentPath === '/analytics' ? activeClassName : inactiveClassName
                }
              >
                Analytics
              </Link>
              {isApiEnabled && (
               <Link
                 href="/api-keys"
                 className={
                   currentPath === '/api-keys' ? activeClassName : inactiveClassName
                 }
               >
                 API Keys
               </Link>
             )}
              {isAdmin && (
                <Link
                  href="/dashboard"
                  className={
                    currentPath === '/dashboard' ? activeClassName : inactiveClassName
                  }
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Right side: Logout button and mobile menu button */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {tokens} Tokens
              </span>
            </div>
            {/* Mobile menu button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {/* Close icon */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {/* Hamburger icon */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                )}
              </button>
            </div>
            {/* Logout button, hidden on mobile */}
            <div className="hidden sm:block">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="sm:hidden px-4 pt-2 pb-3 space-y-2">
          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium text-center">
            {tokens} Tokens
          </div>
          <Link
            href="/templates"
            onClick={handleMobileLinkClick}
            className={
              currentPath === '/templates' ? mobileActiveClassName : mobileInactiveClassName
            }
          >
            Templates
          </Link>
          <Link
            href="/generate"
            onClick={handleMobileLinkClick}
            className={
              currentPath === '/generate' ? mobileActiveClassName : mobileInactiveClassName
            }
          >
            Generate
          </Link>
          <Link
            href="/email"
            onClick={handleMobileLinkClick}
            className={
              currentPath === '/email' ? mobileActiveClassName : mobileInactiveClassName
            }
          >
            Email
          </Link>
          <Link
            href="/analytics"
            onClick={handleMobileLinkClick}
            className={
              currentPath === '/analytics' ? mobileActiveClassName : mobileInactiveClassName
            }
          >
            Analytics
          </Link>
          {isApiEnabled && (
           <Link
             href="/api-keys"
             onClick={handleMobileLinkClick}
             className={
               currentPath === '/api-keys' ? mobileActiveClassName : mobileInactiveClassName
             }
           >
             API Keys
           </Link>
         )}
          {isAdmin && (
            <Link
              href="/dashboard"
              onClick={handleMobileLinkClick}
              className={
                currentPath === '/dashboard' ? mobileActiveClassName : mobileInactiveClassName
              }
            >
              Dashboard
            </Link>
          )}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full px-3 py-2 rounded-md text-sm font-medium"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      )}
    </nav>
  );
}
