"use client";

import { useState, useEffect } from "react";
import { PlusCircle, MoreVertical, Search, Filter, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Project = {
  id: string;
  title: string;
  client: string;
  period: string;
  status: string;
  total_budget: number;
  created_at: string;
};

const mockProjects = [
  {
    id: 1,
    title: "디지털 분야 교육과정 설계 및 교육운영 위탁용역",
    client: "재단법인 제주테크노파크",
    date: "2025.12.01 ~ 12.13",
    cost: 15470000,
    status: "진행중",
    version: "v2.0 (최종)"
  },
  {
    id: 2,
    title: "도민 대상 AI 리터러시 역량강화 교육",
    client: "제주특별자치도",
    date: "2025.10.15 ~ 11.30",
    cost: 8500000,
    status: "완료",
    version: "v1.5"
  },
  {
    id: 3,
    title: "청년창업 활성화 지원사업 멘토링 프로그램",
    client: "제주창조경제혁신센터",
    date: "2025.09.01 ~ 12.31",
    cost: 12000000,
    status: "진행중",
    version: "v1.1"
  }
];

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", client: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      alert('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
      // 생성된 프로젝트 상세(비용 산출) 페이지로 이동
      router.push(`/projects/${projectData.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('프로젝트 생성에 실패했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="p-8 lg:p-12 max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">프로젝트 대시보드</h1>
          <p className="text-slate-500 mt-1 text-sm">현재 진행 중이거나 완료된 교육운영 용역 현황입니다.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-95">
          <PlusCircle size={20} />
          새 프로젝트 생성
        </button>
      </div>

      {/* 통계 / 요약 등 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
          <p className="text-slate-500 text-sm font-semibold tracking-wide">누적 등록 프로젝트</p>
          <p className="text-4xl font-extrabold text-slate-900 mt-3 drop-shadow-sm">{projects.length}<span className="text-lg font-medium text-slate-400 ml-1.5">건</span></p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50 block"></div>
          <p className="text-slate-500 text-sm font-semibold tracking-wide">총 견적 합계</p>
          <p className="text-4xl font-extrabold text-slate-900 mt-3 drop-shadow-sm">
            {new Intl.NumberFormat('ko-KR').format(projects.reduce((sum, p) => sum + (p.total_budget || 0), 0))}<span className="text-lg font-medium text-slate-400 ml-1.5">원</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50 block"></div>
          <p className="text-slate-500 text-sm font-semibold tracking-wide">완료(계약) 건</p>
          <p className="text-4xl font-extrabold text-emerald-600 mt-3 drop-shadow-sm">
            {projects.filter(p => p.status === '완료' || p.status === '계약완료').length}<span className="text-lg font-medium text-emerald-400 ml-1.5">건</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="프로젝트명 또는 발주처 검색..."
              className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-[320px] transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-semibold bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 w-full sm:w-auto">
            <Filter size={16} />
            상태 필터
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="font-semibold text-slate-500 text-[13px] px-6 py-4">프로젝트명 / 발주처</th>
                <th className="font-semibold text-slate-500 text-[13px] px-6 py-4">과업 기간</th>
                <th className="font-semibold text-slate-500 text-[13px] px-6 py-4 text-right">총 견적 금액</th>
                <th className="font-semibold text-slate-500 text-[13px] px-6 py-4 text-center">상태</th>
                <th className="font-semibold text-slate-500 text-[13px] px-6 py-4 text-right">버전</th>
                <th className="font-semibold text-slate-500 text-[13px] px-6 py-4 w-16 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 bg-slate-50/30">
                    <p className="text-sm font-medium mb-1">등록된 프로젝트가 없습니다.</p>
                    <p className="text-xs">우측 상단의 '새 프로젝트 생성' 버튼을 눌러 첫 용역을 시작하세요.</p>
                  </td>
                </tr>
              ) : (
                projects.map(project => (
                  <tr
                    key={project.id}
                    className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{project.title}</p>
                      <p className="text-slate-500 text-sm mt-0.5 font-medium">{project.client}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium tracking-tight whitespace-nowrap">{project.period || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 text-[15px] whitespace-nowrap">
                      {project.total_budget ? `${new Intl.NumberFormat('ko-KR').format(project.total_budget)}원` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide ${project.status === '진행중' ? 'bg-blue-50 text-blue-700 border border-blue-100/50' : 'bg-slate-100 text-slate-700 border border-slate-200/50'}`}>
                        {project.status || '진행중'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[13px] font-semibold text-slate-500">
                      <span className="bg-slate-100/80 px-2 py-1 rounded text-slate-600">v1.0</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-slate-300 hover:text-slate-600 rounded p-1.5 hover:bg-slate-200/50 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 새 프로젝트 생성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">새 프로젝트 생성</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6">
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">프로젝트 일련번호(용역명)</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 디지털 역량강화 교육운영"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">발주처(고객사) 기관명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 재단법인 제주테크노파크"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal"
                    value={newProject.client}
                    onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-50 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-blue-400"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> 생성 중...</>
                  ) : (
                    '만들기 및 시작'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
