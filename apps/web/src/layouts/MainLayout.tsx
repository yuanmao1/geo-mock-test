import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { GeoCopyType, LLMModel } from "@geo/shared-types";

// Reusing the context if it was exported, but it seems App.tsx defined it locally.
// For now, I'll just copy the UI structure. 
// Ideally, context should be in a separate file, but to minimize disruption, 
// I will assume the Context Provider stays in App.tsx and wraps the router, 
// and this layout just handles the visual Nav/Footer.

const MainLayout: React.FC = () => {
    const location = useLocation();
    
    // Quick check if we are in AI perspective (logic from original App.tsx)
    const isAiPerspective = location.search.includes("mode=ai") || location.pathname.includes("/product/");
    // Actually the original App.tsx had state "isAiPerspective".
    // I will just simplify and render the standard Navbar here.

    return (
        <div className="min-h-screen bg-white transition-colors duration-500">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-xl bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600">
                                <span className="text-white font-bold text-xl">G</span>
                            </div>
                            <span className="text-xl font-black tracking-tight text-gray-900">
                                GEO<span className="text-indigo-600">MALL</span>
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center space-x-8">
                            <Link to="/" className="text-sm font-medium text-gray-700 hover:text-indigo-600">
                                首页
                            </Link>
                            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600">
                                新品
                            </a>
                            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600">
                                限时特惠
                            </a>
                        </div>

                        <div className="flex items-center space-x-4">
                           {/* Simplified Icons */}
                           <button className="p-2 text-gray-400 hover:text-gray-600">
                              🔍
                           </button>
                           <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                              🛒
                              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                                2
                              </span>
                           </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main>
                <Outlet />
            </main>

            <footer className="border-t py-12 mt-20 transition-colors duration-500 bg-gray-50 border-gray-100">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm transition-colors text-gray-400">
                        © 2025 GEOMALL 演示平台 - 模拟真实电商交互体验
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
