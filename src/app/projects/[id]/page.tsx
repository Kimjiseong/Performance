"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, CheckCircle2, History, FileDown, Loader2, Edit2, Check, MoreVertical, Copy, GripVertical, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

type EstimateItem = {
    id: string; // db uuid
    version_id?: string;
    category: string;
    name: string;
    unit_price: number;
    quantity: number;
    count: number;
    remarks?: string;
    order_index?: number;
    isNew?: boolean; // 새롭게 추가된 항목 판별용 클라이언트 상태
};

type ProjectInfo = {
    id: string;
    title: string;
    client: string;
    period: string;
    status: string;
    total_budget: number;
    department?: string;
    manager?: string;
    contact?: string;
    objective?: string;
    contract_date?: string;
    operation_details?: string;
    recruitment_schedule?: string;
    operation_time_place?: string;
    goals?: string;
    requirements?: string;
};

type EstimateVersion = {
    id: string;
    version_name: string;
    is_final: boolean;
};

const SortableHeader = ({ label, sortKey, currentSort, onSort, className = "", align = "left" }: any) => {
    return (
        <th 
            className={`px-4 py-4 text-[13px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
                <span>{label}</span>
                <span className="flex flex-col">
                    {currentSort && currentSort.key === sortKey ? (
                        currentSort.direction === 'asc' ? <ArrowUp size={14} className="text-blue-500" /> : <ArrowDown size={14} className="text-blue-500" />
                    ) : (
                        <ArrowUpDown size={14} className="text-slate-300 opacity-50" />
                    )}
                </span>
            </div>
        </th>
    );
};

export default function ProjectDetail() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [activeTab, setActiveTab] = useState("estimate");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditingVersion, setIsEditingVersion] = useState(false);
    const [editingVersionName, setEditingVersionName] = useState("");
    const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

    // 모달 상태
    const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
    const [newVersionName, setNewVersionName] = useState("");
    const [isDeleteVersionModalOpen, setIsDeleteVersionModalOpen] = useState(false);
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // 데이터베이스 상태
    const [project, setProject] = useState<ProjectInfo | null>(null);
    const [versions, setVersions] = useState<EstimateVersion[]>([]);
    const [currentVersion, setCurrentVersion] = useState<EstimateVersion | null>(null);
    const [items, setItems] = useState<EstimateItem[]>([]);

    const categories = ["인건비", "강사비", "교육운영비", "교육생 지원비", "홍보비", "기타"];

    // 데이터 로드
    useEffect(() => {
        if (!projectId) return;
        fetchProjectData();
    }, [projectId]);

    const fetchProjectData = async () => {
        try {
            // 유효한 UUID 형식이 아닐 경우 오류 방지 (예: 과거 목업 데이터 id '1', '2' 등 접근 시)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(projectId)) {
                setIsLoading(false);
                return; // project가 null로 남아 "프로젝트를 찾을 수 없습니다" 화면 표시됨
            }

            // 1. 프로젝트 기본 정보
            const { data: projData, error: projError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            if (projError) throw projError;
            setProject(projData);

            // 2. 버전 목록 및 최신 버전 선택
            const { data: verData, error: verError } = await supabase
                .from('estimate_versions')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            if (verError) throw verError;

            setVersions(verData || []);
            const latestVersion = verData && verData.length > 0 ? verData[0] : null;
            setCurrentVersion(latestVersion);

            // 3. 현재 버전의 견적 내역 불러오기
            if (latestVersion) {
                setEditingVersionName(latestVersion.version_name);
                const { data: itemData, error: itemError } = await supabase
                    .from('estimate_items')
                    .select('*')
                    .eq('version_id', latestVersion.id)
                    .order('order_index', { ascending: true });
                if (itemError) throw itemError;

                // 조회된 데이터 세팅. 없으면 빈 배열
                setItems(itemData || []);
            }
        } catch (error: any) {
            console.error('Error fetching project data:', error.message || error);
            alert(`데이터를 불러오는 중 오류가 발생했습니다. (${error.message || '상세 정보 없음'})`);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTotal = (item: EstimateItem) => item.unit_price * item.quantity * item.count;
    const grandTotal = items.reduce((sum, item) => sum + calculateTotal(item), 0);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = [...items].sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'total') {
            aValue = calculateTotal(a);
            bValue = calculateTotal(b);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const vat = project?.total_budget ? Math.floor(project.total_budget / 11) : 0;
    const profit = project?.total_budget ? project.total_budget - grandTotal - vat : 0;

    const addItem = () => {
        setItems([...items, {
            id: Date.now().toString(), // 임시 ID
            category: "기타",
            name: "",
            unit_price: 0,
            quantity: 1,
            count: 1,
            remarks: "",
            isNew: true // 새 항목 표시
        }]);
    };

    const handleVersionSelect = async (version: EstimateVersion) => {
        setIsVersionDropdownOpen(false);
        setCurrentVersion(version);
        setEditingVersionName(version.version_name);
        setIsLoading(true);
        try {
            const { data: itemData, error: itemError } = await supabase
                .from('estimate_items')
                .select('*')
                .eq('version_id', version.id)
                .order('order_index', { ascending: true });
            if (itemError) throw itemError;
            setItems(itemData || []);
        } catch (error) {
            console.error('Error fetching version items:', error);
            alert('버전 내역을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const removeItem = async (id: string, isNew?: boolean) => {
        // 이미 DB에 있는 항목이면 삭제 처리
        if (!isNew && currentVersion) {
            try {
                const { error } = await supabase.from('estimate_items').delete().eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.error("항목 삭제 오류", err);
                alert("항목 삭제에 실패했습니다.");
                return;
            }
        }
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof EstimateItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // 데이터 저장 (이름 변경은 이미 실시간 처리되므로, 항목들만 저장)
    const executeSave = async () => {
        if (!currentVersion || !project) return;
        setIsSaving(true);
        try {
            // 1. 프로젝트 기본 정보 업데이트
            await supabase.from('projects')
                .update({
                    title: project.title,
                    client: project.client,
                    period: project.period,
                    total_budget: project.total_budget
                })
                .eq('id', project.id);

            // 2. 버전 이름 업데이트 로직 제거 (실시간 자동 저장으로 완벽 이관됨)

            // 3. 견적 아이템들 저장 (Insert / Update 분리)
            const itemsToInsert: any[] = [];
            const itemsToUpdate: any[] = [];

            items.forEach((item, index) => {
                const baseItem = {
                    version_id: currentVersion.id,
                    category: item.category,
                    name: item.name,
                    unit_price: item.unit_price,
                    quantity: item.quantity,
                    count: item.count,
                    remarks: item.remarks || "",
                    order_index: index
                };

                if (item.isNew) {
                    itemsToInsert.push(baseItem);
                } else {
                    itemsToUpdate.push({ ...baseItem, id: item.id });
                }
            });

            if (itemsToInsert.length > 0) {
                const { error: insertErr } = await supabase.from('estimate_items').insert(itemsToInsert);
                if (insertErr) throw insertErr;
            }

            if (itemsToUpdate.length > 0) {
                const { error: updateErr } = await supabase.from('estimate_items').upsert(itemsToUpdate);
                if (updateErr) throw updateErr;
            }

            alert("견적 내역이 저장되었습니다.");
            fetchProjectData();
        } catch (error: any) {
            console.error("저장 중 오류 발생", error, error.message, error.details, error.hint);
            alert(`저장 중 오류가 발생했습니다. (${error.message || JSON.stringify(error)})`);
        } finally {
            setIsSaving(false);
        }
    };

    // 기본정보 탭 전용 저장 (버전/아이템 영향 X)
    const executeInfoSave = async () => {
        if (!project) return;
        setIsSaving(true);
        try {
            const { error: updateError } = await supabase.from('projects')
                .update({
                    title: project.title,
                    client: project.client,
                    period: project.period,
                    total_budget: project.total_budget,
                    department: project.department || null,
                    manager: project.manager || null,
                    contact: project.contact || null,
                    objective: project.objective || null,
                    contract_date: project.contract_date || null,
                    operation_details: project.operation_details || null,
                    recruitment_schedule: project.recruitment_schedule || null,
                    operation_time_place: project.operation_time_place || null,
                    goals: project.goals || null,
                    requirements: project.requirements || null,
                })
                .eq('id', project.id);
            if (updateError) throw updateError;
            
            alert("용역 기본정보가 저장되었습니다.");
            fetchProjectData();
        } catch (error: any) {
            console.error("기본정보 저장 중 오류 발생", error);
            alert(`저장 중 오류가 발생했습니다. (${error.message || JSON.stringify(error)})`);
        } finally {
            setIsSaving(false);
        }
    };

    // 새 견적 버전 생성 (현재 목록 복사)
    const handleCreateNewVersion = async () => {
        if (!project || !newVersionName) return;
        setIsSaving(true);
        setIsNewVersionModalOpen(false);
        try {
            // 1. 새 버전 insert
            const { data: newVer, error: verErr } = await supabase.from('estimate_versions')
                .insert({ project_id: project.id, version_name: newVersionName, is_final: false })
                .select().single();
            if (verErr) throw verErr;

            // 2. 현재 화면의 아이템들을 새 버전 ID로 묶어서 insert (복제 모드일 때만 실행)
            if (isDuplicateMode) {
                const itemsToInsert = items.map((item, index) => ({
                    version_id: newVer.id,
                    category: item.category,
                    name: item.name,
                    unit_price: item.unit_price,
                    quantity: item.quantity,
                    count: item.count,
                    remarks: item.remarks || "",
                    order_index: index
                }));

                if (itemsToInsert.length > 0) {
                    const { error: itemErr } = await supabase.from('estimate_items').insert(itemsToInsert);
                    if (itemErr) throw itemErr;
                }
            }

            alert(isDuplicateMode ? "견적 버전이 복제되었습니다." : "빈 견적 버전이 새로 생성되었습니다.");
            fetchProjectData();
        } catch (error: any) {
            console.error("새 버전 생성 오류", error, error.message, error.details);
            alert(`새 버전 생성에 실패했습니다. (${error.message || JSON.stringify(error)})`);
        } finally {
            setIsSaving(false);
        }
    };

    // 버전 이름만 분리하여 즉시 자동 저장
    const handleVersionNameUpdate = async (newName: string) => {
        if (!currentVersion || !newName.trim() || newName === currentVersion.version_name) {
            setEditingVersionName(currentVersion?.version_name || ""); // 원래 이름으로 롤백
            setIsEditingVersion(false);
            return;
        }

        try {
            const { error } = await supabase.from('estimate_versions')
                .update({ version_name: newName })
                .eq('id', currentVersion.id);

            if (error) throw error;

            // 로컬 상태 즉시 갱신
            const updatedVersion = { ...currentVersion, version_name: newName };
            setCurrentVersion(updatedVersion);
            setVersions(versions.map(v => v.id === currentVersion.id ? updatedVersion : v));
        } catch (error: any) {
            console.error("버전명 업데이트 실패", error);
            alert("이름 저장에 실패했습니다.");
            setEditingVersionName(currentVersion.version_name); // 실패 시 롤백
        } finally {
            setIsEditingVersion(false);
        }
    };

    // 견적 버전 삭제 로직
    const handleDeleteVersion = async () => {
        if (!currentVersion) return;
        setIsSaving(true);
        setIsDeleteVersionModalOpen(false);
        try {
            const { error } = await supabase.from('estimate_versions').delete().eq('id', currentVersion.id);
            if (error) throw error;

            alert("버전이 삭제되었습니다.");
            fetchProjectData();
        } catch (error: any) {
            console.error("버전 삭제 오류", error, error.message);
            alert(`버전 삭제에 실패했습니다. (${error.message || JSON.stringify(error)})`);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        setActiveTab("estimate"); // 인쇄 시 견적 탭 강제 선택
        setTimeout(() => {
            window.print();
        }, 100);
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
                <p className="text-slate-500 font-bold">프로젝트를 찾을 수 없습니다.</p>
                <Link href="/" className="text-blue-500 underline text-sm">목록으로 돌아가기</Link>
            </div>
        );
    }

    return (
        <main className="flex flex-col h-screen overflow-hidden bg-slate-50/50 print:bg-white print:h-auto print:overflow-visible">

            {/* 회사 공식 문서 제목 (프린트 시에만 노출) */}
            <div className="hidden print:block text-center py-10 mb-6 border-b-2 border-slate-900">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">교육운영 용역 비용 산출 내역서</h1>
                <p className="text-slate-600 font-semibold text-lg">재단법인 제주테크노파크 제출용</p>
            </div>

            {/* 헤더 바 */}
            <header className="px-8 py-5 bg-white border-b border-slate-200 flex justify-between items-center z-10 shrink-0 no-print">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-100/50 hover:bg-slate-100 p-2 rounded-lg">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${project.status === '진행중' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                {project.status}
                            </span>
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                <input
                                    type="text"
                                    className="bg-transparent outline-none hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all -ml-2"
                                    value={project.title}
                                    onChange={(e) => setProject({ ...project, title: e.target.value })}
                                />
                            </h1>
                        </div>
                        <p className="text-slate-500 text-[13px] mt-1 font-medium">
                            <input
                                type="text"
                                className="bg-transparent outline-none hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all -ml-2 min-w-[300px]"
                                value={project.client}
                                onChange={(e) => setProject({ ...project, client: e.target.value })}
                            />
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* 버전별 기능은 '비용 산출 (견적)' 탭에서만 활성화 */}
                    {activeTab === 'estimate' && (
                        <>
                            <div className="relative z-20">
                                <div 
                                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl transition-colors cursor-pointer hover:bg-slate-100" 
                                    onClick={() => {
                                        setIsVersionDropdownOpen(!isVersionDropdownOpen);
                                        setIsMoreMenuOpen(false);
                                    }}
                                >
                                    <History size={16} className="text-slate-400" />
                                    <span className="text-sm font-semibold text-slate-700">
                                        기존 버전 불러오기
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className={`ml-1 text-slate-400 transition-transform ${isVersionDropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </div>
                                {/* 버전 드롭다운 메뉴 */}
                                {isVersionDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 overflow-hidden">
                                        <div className="px-3 pb-2 pt-1 border-b border-slate-100 mb-1">
                                            <p className="text-xs font-semibold text-slate-500">저장된 버전 내역</p>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {versions.length > 0 ? versions.map(v => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => handleVersionSelect(v)}
                                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${currentVersion?.id === v.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span>{v.version_name}</span>
                                                        {currentVersion?.id === v.id && <Check size={14} className="text-blue-500" />}
                                                    </div>
                                                </button>
                                            )) : (
                                                <div className="px-4 py-3 text-sm text-slate-500 text-center">버전 없음</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* PDF 출력 기능 (미완성으로 임시 숨김 처리)
                    {activeTab === 'estimate' && (
                        <button onClick={handlePrint} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                            <FileDown size={18} />
                            PDF 출력
                        </button>
                    )}
                    */}

                    {/* 공통 동작 (탭별 분기 저장) */}
                    <button 
                        onClick={() => { 
                            if (activeTab === 'info') {
                                executeInfoSave();
                            } else {
                                executeSave(); 
                            }
                        }} 
                        disabled={isSaving} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:bg-blue-400"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        저장
                    </button>

                    {/* 더보기(Kebab) 메뉴 - estimate 탭에서만 활성화 */}
                    {activeTab === 'estimate' && (
                        <div className="relative z-20">
                            <button 
                                onClick={() => {
                                    setIsMoreMenuOpen(!isMoreMenuOpen);
                                    setIsVersionDropdownOpen(false);
                                }} 
                                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2.5 rounded-xl transition-colors shadow-sm"
                            >
                                <MoreVertical size={18} />
                            </button>
                            
                            {isMoreMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 overflow-hidden">
                                    <div className="px-3 pb-2 pt-1 border-b border-slate-100 mb-1">
                                        <p className="text-xs font-semibold text-slate-500">버전 관련 추가 옵션</p>
                                    </div>
                                    <button 
                                        onClick={() => { setIsDuplicateMode(false); setNewVersionName("새 빈 견적서"); setIsNewVersionModalOpen(true); setIsMoreMenuOpen(false); }} 
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Plus size={16} className="text-blue-500" /> 신규 버전 생성
                                    </button>
                                    <button 
                                        onClick={() => { setIsDuplicateMode(true); setNewVersionName(`${currentVersion?.version_name || '견적'} 복사본`); setIsNewVersionModalOpen(true); setIsMoreMenuOpen(false); }} 
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Copy size={16} className="text-emerald-500" /> 현재 버전 복제
                                    </button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button 
                                        onClick={() => { setIsDeleteVersionModalOpen(true); setIsMoreMenuOpen(false); }} 
                                        disabled={versions.length <= 1}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 disabled:text-red-300 disabled:hover:bg-transparent transition-colors"
                                    >
                                        <Trash2 size={16} /> 현재 버전 삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    )}


                </div>
            </header>

            {/* 탭 네비게이션 */}
            <div className="px-8 pt-6 pb-0 bg-white border-b border-slate-200 shrink-0 no-print">
                <div className="flex gap-8">
                    {[
                        { id: "info", label: "용역 기본정보" },
                        { id: "estimate", label: "비용 산출 (견적)" },
                        { id: "meeting", label: "회의록 및 R&R" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 px-1 text-[15px] font-bold transition-all relative ${activeTab === tab.id
                                ? "text-blue-600"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full shadow-[0_-2px_8px_rgba(37,99,235,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 컨텐츠 영역 */}
            <div className="flex-1 overflow-auto p-8 relative">
                {activeTab === "info" && (
                    <div className="max-w-4xl mx-auto space-y-6 pb-10">
                        {/* 상단 요약 (기간/예산) */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-blue-500" />
                                핵심 요약
                            </h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">과업기간</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={project.period?.split(' ~ ')[0] || ""}
                                            onChange={(e) => {
                                                const end = project.period?.split(' ~ ')[1] || "";
                                                setProject({ ...project, period: `${e.target.value} ~ ${end}` });
                                            }}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
                                        />
                                        <span className="text-slate-400 font-bold">~</span>
                                        <input
                                            type="date"
                                            value={project.period?.split(' ~ ')[1] || ""}
                                            onChange={(e) => {
                                                const start = project.period?.split(' ~ ')[0] || "";
                                                setProject({ ...project, period: `${start} ~ ${e.target.value}` });
                                            }}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">총 예산 (VAT 포함)</label>
                                    <input
                                        type="text"
                                        value={project.total_budget ? new Intl.NumberFormat('ko-KR').format(project.total_budget) : ""}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/,/g, '');
                                            if (val === '' || !isNaN(Number(val))) {
                                                setProject({ ...project, total_budget: val === '' ? 0 : Number(val) });
                                            }
                                        }}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 hover:bg-white focus:bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                                        placeholder="총 예산액 (숫자만 입력)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 1. 발주처 정보 */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <h3 className="text-[16px] font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">발주처 정보</h3>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">기관명</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 재단법인 제주테크노파크" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.client || ""}
                                        onChange={(e) => setProject({ ...project, client: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">부서명</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 미래융합사업본부" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.department || ""}
                                        onChange={(e) => setProject({ ...project, department: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">담당자 (직위)</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 홍길동 선임연구원" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.manager || ""}
                                        onChange={(e) => setProject({ ...project, manager: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">연락처</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 064-123-4567 / email@example.com" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.contact || ""}
                                        onChange={(e) => setProject({ ...project, contact: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. 과업 개요 */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <h3 className="text-[16px] font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">과업 개요</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">과업 목적</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder="과업 목적 및 배경 입력" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                        value={project.objective || ""}
                                        onChange={(e) => setProject({ ...project, objective: e.target.value })}
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">계약일</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-700" 
                                        value={project.contract_date || ""}
                                        onChange={(e) => setProject({ ...project, contract_date: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. 세부 요구사항 */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <h3 className="text-[16px] font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">세부 요구사항</h3>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">운영 과정 및 모집 인원</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 2개 과정, 각 20명 선발" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.operation_details || ""}
                                        onChange={(e) => setProject({ ...project, operation_details: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">모집 일정</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 2025.11.17 ~ 11.27" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.recruitment_schedule || ""}
                                        onChange={(e) => setProject({ ...project, recruitment_schedule: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">운영 시간 및 장소</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: JTP 전산강의실 (10-17시)" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.operation_time_place || ""}
                                        onChange={(e) => setProject({ ...project, operation_time_place: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. 확인사항 */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <h3 className="text-[16px] font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">확인사항</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">사업 목표치 확인 / 교육과정</label>
                                    <input 
                                        type="text" 
                                        placeholder="예: 주요 목표치 등재" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" 
                                        value={project.goals || ""}
                                        onChange={(e) => setProject({ ...project, goals: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">강사 섭외 및 결과물 제출 규격</label>
                                    <textarea 
                                        rows={2} 
                                        placeholder="예: 교육결과보고서, 출석부 제출" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                        value={project.requirements || ""}
                                        onChange={(e) => setProject({ ...project, requirements: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
                            <p className="text-orange-800 text-sm font-medium">💡 기타 정보들은 현재 입력 편의성 강화를 위한 업데이트가 준비 중입니다.</p>
                        </div>
                    </div>
                )}

                {activeTab === "estimate" && (
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        
                        {/* 버전명 텍스트 에디터 (구글 문서 스타일) */}
                        <div className="flex px-2 pt-2 mb-2">
                            {currentVersion && (
                                <div className="group relative flex items-center max-w-lg w-full">
                                    <input
                                        type="text"
                                        value={isEditingVersion ? editingVersionName : (currentVersion.version_name || "")}
                                        onChange={(e) => setEditingVersionName(e.target.value)}
                                        onFocus={() => {
                                            setEditingVersionName(currentVersion.version_name);
                                            setIsEditingVersion(true);
                                        }}
                                        onBlur={(e) => handleVersionNameUpdate(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.currentTarget.blur(); // focus 해제하며 자동 저장 유도
                                            }
                                        }}
                                        className={`w-full text-left text-2xl font-extrabold text-slate-800 bg-transparent border-b-2 outline-none transition-all py-1.5 focus:border-blue-500 focus:bg-white focus:px-4 focus:shadow-sm focus:rounded-t-lg rounded-b-none
                                            ${isEditingVersion ? 'border-blue-500 bg-white px-4' : 'border-transparent hover:border-slate-300 pr-8'}
                                        `}
                                        title="클릭하여 견적 버전을 변경하세요"
                                        placeholder="견적 버전 이름을 입력하세요"
                                    />
                                    {!isEditingVersion && (
                                        <div className="absolute right-2 text-slate-300 group-hover:text-slate-500 transition-colors pointer-events-none">
                                            <Edit2 size={18} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 금액 요약 카드 */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex w-full md:w-auto gap-4 md:gap-8 items-center border-b md:border-b-0 border-white/20 pb-4 md:pb-0">
                                <div>
                                    <p className="text-blue-100 text-xs md:text-sm font-semibold tracking-wide mb-1">총 예산 (VAT 포함)</p>
                                    <p className="text-xl md:text-2xl font-bold tracking-tight text-blue-50">
                                        {project.total_budget ? new Intl.NumberFormat('ko-KR').format(project.total_budget) : 0}<span className="text-sm ml-1 font-medium text-blue-200">원</span>
                                    </p>
                                </div>
                                <div className="text-blue-200/50 font-bold text-lg md:text-2xl">-</div>
                                <div>
                                    <p className="text-blue-100 text-xs md:text-sm font-semibold tracking-wide mb-1">작성 견적 합계</p>
                                    <p className="text-xl md:text-2xl font-bold tracking-tight text-blue-50">
                                        {new Intl.NumberFormat('ko-KR').format(grandTotal)}<span className="text-sm ml-1 font-medium text-blue-200">원</span>
                                    </p>
                                </div>
                                <div className="text-blue-200/50 font-bold text-lg md:text-2xl">-</div>
                                <div>
                                    <p className="text-blue-100 text-xs md:text-sm font-semibold tracking-wide mb-1">부가세</p>
                                    <p className="text-xl md:text-2xl font-bold tracking-tight text-blue-50">
                                        {new Intl.NumberFormat('ko-KR').format(vat)}<span className="text-sm ml-1 font-medium text-blue-200">원</span>
                                    </p>
                                </div>
                                <div className="text-blue-200/50 font-bold text-lg md:text-2xl">=</div>
                                <div>
                                    <p className="text-blue-100 text-xs md:text-sm font-semibold tracking-wide mb-1">추정 이익</p>
                                    <p className={`text-2xl md:text-4xl font-extrabold tracking-tight drop-shadow-md ${profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                        {project.total_budget ? new Intl.NumberFormat('ko-KR').format(profit) : 0}<span className="text-base md:text-xl ml-1.5 font-medium text-blue-200">원</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 견적 작성 테이블 */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-2 py-4 w-10 text-center text-slate-400"><GripVertical size={14} className="mx-auto opacity-50" /></th>
                                        <SortableHeader label="구분" sortKey="category" currentSort={sortConfig} onSort={handleSort} className="w-48" />
                                        <SortableHeader label="내역" sortKey="name" currentSort={sortConfig} onSort={handleSort} className="min-w-[200px]" />
                                        <SortableHeader label="단가(원)" sortKey="unit_price" currentSort={sortConfig} onSort={handleSort} className="w-40 text-right" align="right" />
                                        <SortableHeader label="수량" sortKey="quantity" currentSort={sortConfig} onSort={handleSort} className="w-24 text-right" align="right" />
                                        <SortableHeader label="인원/횟수" sortKey="count" currentSort={sortConfig} onSort={handleSort} className="w-24 text-right" align="right" />
                                        <SortableHeader label="공급가액" sortKey="total" currentSort={sortConfig} onSort={handleSort} className="w-36 text-right" align="right" />
                                        <th className="px-4 py-4 text-[13px] font-bold text-slate-500 w-40">비고</th>
                                        <th className="px-2 py-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedItems.map((item, index) => (
                                        <tr 
                                            key={item.id} 
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed = 'move';
                                                e.dataTransfer.setData('text/plain', index.toString());
                                            }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                                if (isNaN(dragIndex) || dragIndex === index) return;
                                                const newItems = [...items];
                                                const [dragItem] = newItems.splice(dragIndex, 1);
                                                newItems.splice(index, 0, dragItem);
                                                setItems(newItems.map((itm, idx) => ({ ...itm, order_index: idx })));
                                            }}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            <td className="px-2 py-3 text-center cursor-grab active:cursor-grabbing" title="드래그하여 순서 변경">
                                                <GripVertical size={16} className="mx-auto text-slate-300 hover:text-slate-500 transition-colors" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-2 text-sm font-medium text-slate-700 outline-none transition-all"
                                                    value={item.category}
                                                    onChange={(e) => updateItem(item.id, "category", e.target.value)}
                                                >
                                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300"
                                                    placeholder="내역 이름 입력"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-sm font-bold text-slate-900 text-right outline-none transition-all"
                                                    value={item.unit_price ? new Intl.NumberFormat('ko-KR').format(item.unit_price) : ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/,/g, '');
                                                        // 빈 문자열이거나 유효한 숫자인 경우만 업데이트
                                                        if (val === '' || !isNaN(Number(val))) {
                                                            updateItem(item.id, "unit_price", val === '' ? 0 : Number(val));
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-2 text-sm font-bold text-slate-900 text-right outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={item.quantity || ""}
                                                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-2 text-sm font-bold text-slate-900 text-right outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={item.count || ""}
                                                    onChange={(e) => updateItem(item.id, "count", Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-[15px] font-extrabold text-blue-700 block pr-2">
                                                    {new Intl.NumberFormat('ko-KR').format(calculateTotal(item))}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300"
                                                    placeholder="비고 입력"
                                                    value={item.remarks || ""}
                                                    onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() => removeItem(item.id, item.isNew)}
                                                    className="text-red-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50 opacity-60 group-hover:opacity-100 focus:opacity-100"
                                                    title="항목 삭제"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center no-print">
                                <button
                                    onClick={addItem}
                                    className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-all"
                                >
                                    <Plus size={18} />
                                    새 항목 추가
                                </button>
                            </div>

                            {/* 프린트 시 하단 결재/회사 정보 노출 */}
                            <div className="hidden print:block mt-16 text-right">
                                <p className="text-lg font-bold text-slate-900 mb-8">상기와 같이 견적합니다.</p>
                                <div className="inline-block text-left mr-8">
                                    <p className="text-slate-600 mb-2">2026년 3월 5일</p>
                                    <p className="text-xl font-bold text-slate-900">주식회사 마소캠퍼스</p>
                                    <div className="w-20 h-20 border-2 border-red-500 rounded-full inline-flex items-center justify-center text-red-500 font-bold ml-16 transform -translate-y-12 opacity-80 rotate-12">
                                        법인<br />인감
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === "meeting" && (
                    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center py-20 no-print">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History className="text-slate-400" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">회의록 및 R&R</h3>
                        <p className="text-slate-500">이 탭의 내용은 협업 모듈과 함께 향후 업데이트될 예정입니다.</p>
                    </div>
                )}
            </div>

            {/* 새 견적(버전) 생성 모달 */}
            {isNewVersionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-blue-600 mb-2 flex items-center gap-2">
                            <Plus size={20} /> 새 버전 생성
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">현재 작성된 견적서를 복사하여 새로운 버전을 만듭니다.</p>
                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">새로운 버전 이름</label>
                            <input
                                type="text"
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                                placeholder="예: v2.0 수정견적"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsNewVersionModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">취소</button>
                            <button onClick={handleCreateNewVersion} disabled={isSaving} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2">
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                생성하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 버전 삭제 확인 모달 */}
            {isDeleteVersionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                            <Trash2 size={20} /> 버전 삭제 확인
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">정말로 <strong>{currentVersion?.version_name}</strong> 버전을 삭제하시겠습니까? 관련 견적 항목이 모두 함께 삭제되며 복구할 수 없습니다.</p>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsDeleteVersionModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">취소</button>
                            <button onClick={handleDeleteVersion} disabled={isSaving} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md flex items-center gap-2">
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
