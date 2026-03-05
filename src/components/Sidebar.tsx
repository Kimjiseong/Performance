"use client";

import Link from "next/link";
import { LayoutDashboard, FileText, Settings, HelpCircle, PlusCircle, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProject, setNewProject] = useState({ title: "", client: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProject.title || !newProject.client) {
            alert("프로젝트명과 발주처를 입력해주세요.");
            return;
        }
        setIsSubmitting(true);
        try {
            // 1. 새 프로젝트 생성
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .insert([{ title: newProject.title, client: newProject.client }])
                .select()
                .single();

            if (projectError) throw projectError;

            // 2. 기본 버전(v1.0) 자동 생성
            const { data: versionData, error: versionError } = await supabase
                .from('estimate_versions')
                .insert([{ project_id: projectData.id, version_name: 'v1.0 기초견적' }])
                .select()
                .single();

            if (versionError) throw versionError;

            setIsModalOpen(false);
            setNewProject({ title: "", client: "" });
            // 생성된 프로젝트 상세(비용 산출) 페이지로 이동
            router.push(`/projects/${projectData.id}`);
        } catch (error) {
            console.error('Error creating project:', error);
            alert('프로젝트 생성에 실패했습니다.');
            setIsSubmitting(false);
        }
    };

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-40 w-[260px]">
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
                <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm">
                    <PlusCircle size={20} />
                    <span>새 프로젝트 등록</span>
                </button>
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

            {/* 신규 프로젝트 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">새 프로젝트 생성</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">프젝트명 (용역명)</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.title}
                                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 placeholder:text-slate-400"
                                    placeholder="예) 디지털 인재양성 교육운영 용역"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">발주처</label>
                                <input
                                    type="text"
                                    required
                                    value={newProject.client}
                                    onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 placeholder:text-slate-400"
                                    placeholder="예) 제주특별자치도"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 disabled:opacity-70 disabled:hover:bg-blue-600"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        '프로젝트 생성 및 견적 작성하기'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </aside>
    );
}
