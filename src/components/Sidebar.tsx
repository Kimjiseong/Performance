import Link from "next/link";
import { LayoutDashboard, FileText, Settings, HelpCircle, FilePlus } from "lucide-react";

export default function Sidebar() {
    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-10 w-[260px]">
            <div className="p-6">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                    제주테크노파크<br />
                    <span className="text-blue-600 text-[15px] font-semibold mt-1 inline-block">스마트 견적 시스템</span>
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-2.5 mt-2">
                <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold transition-colors duration-200">
                    <LayoutDashboard size={20} strokeWidth={2.5} />
                    <span>프로젝트 대시보드</span>
                </Link>
                <div className="pt-5 pb-1">
                    <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">업무</p>
                </div>
                <Link href="/projects/new" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 font-medium">
                    <FilePlus size={20} />
                    <span>새 용역 등록</span>
                </Link>
                <Link href="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 font-medium">
                    <FileText size={20} />
                    <span>전체 견적서 목록</span>
                </Link>
            </nav>

            <div className="p-4 border-t border-slate-100">
                <Link href="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors duration-200">
                    <Settings size={20} />
                    <span>시스템 설정</span>
                </Link>
            </div>
        </aside>
    );
}
