import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

type Stage = "매입" | "재고" | "수출 준비" | "선적" | "증빙";
type PaymentType = "현금" | "계좌이체" | "계산서" | "경매 결제";
type Vehicle = {
  id: string; vin: string; model: string; year: number; purchaseType: "딜러" | "개인" | "경매";
  stage: Stage; assignee: string; risk?: string; tone?: "danger" | "warning";
  missing: string[]; amount: string; rights: string; blocked?: boolean; paymentType?: PaymentType;
  country?: string; buyer?: string; shipDate?: string; availableDate?: string; estimatedMargin?: string;
  contractAmount?: number; paymentAmount?: number; invoiceUsd?: number; exchangeRate?: number; exchangeRateDate?: string; exportDeclarationAmount?: number; tolerance?: number;
};
type OperationalAlert = {
  id: string; stage: Stage; team: "영업팀" | "회계팀"; title: string; vehicle: string;
  owner: string; due: string; impact: string; tone: "danger" | "warning"; type: string; category: "권리" | "매입" | "선적" | "증빙"; vehicleId?: string;
};

const vehicles: Vehicle[] = [
  { id: "v1", vin: "KNAGN4AD3RA123481", model: "현대 포터 II", year: 2021, purchaseType: "딜러", stage: "수출 준비", assignee: "김영업", risk: "선적 전 권리 재조회 필요", tone: "warning", missing: ["수출신고필증"], amount: "정상", rights: "재조회 필요", paymentType: "계산서", country: "일본", buyer: "Tokyo Auto Co.", shipDate: "12/02", availableDate: "11/29", estimatedMargin: "₩2,400,000", contractAmount: 30000000, paymentAmount: 30000000, invoiceUsd: 22400, exchangeRate: 1392, exchangeRateDate: "11/24" },
  { id: "v2", vin: "KMHWA81H7KU849205", model: "기아 봉고 III", year: 2020, purchaseType: "개인", stage: "재고", assignee: "박정산", risk: "계약 금액과 입금액 불일치", tone: "danger", missing: ["소유권 확인 자료", "지급 증빙"], amount: "-₩1,200,000", rights: "정상", paymentType: "계좌이체", country: "베트남", buyer: "Hanoi Motors", shipDate: "12/05", availableDate: "보류", estimatedMargin: "검토 필요", contractAmount: 30000000, paymentAmount: 28800000, invoiceUsd: 21500, exchangeRate: 1392, exchangeRateDate: "11/24" },
  { id: "v3", vin: "WVWZZZ1KZBW604712", model: "폭스바겐 골프", year: 2019, purchaseType: "경매", stage: "증빙", assignee: "최회계", risk: "B/L 제출 기한 D-2", tone: "warning", missing: ["B/L", "외화 입금증명"], amount: "환율 범위 내", rights: "정상", paymentType: "경매 결제", country: "칠레", buyer: "Santiago Cars", shipDate: "11/28", availableDate: "11/26", estimatedMargin: "₩1,850,000", contractAmount: 30000000, paymentAmount: 30000000, invoiceUsd: 22400, exchangeRate: 1392, exchangeRateDate: "11/24" },
  { id: "v4", vin: "JHMCM56557C402918", model: "혼다 어코드", year: 2017, purchaseType: "딜러", stage: "수출 준비", assignee: "김영업", risk: "압류 이력 발견 — 선적 차단", tone: "danger", missing: [], amount: "정상", rights: "압류 이력", blocked: true, paymentType: "계좌이체", country: "몽골", buyer: "Ulaanbaatar Auto", shipDate: "12/01", availableDate: "권리 해소 후", estimatedMargin: "₩3,100,000", contractAmount: 30000000, paymentAmount: 30000000, invoiceUsd: 22400, exchangeRate: 1392, exchangeRateDate: "11/24" },
];

type HistoryEvent = { id: string; at: string; actor: string; action: string; reason?: string };
type ApprovalRequest = { id: string; vehicleId: string; stage: Stage; requester: string; reviewer: string; requestedAt: string; due: string; status: "검토 대기" | "승인" | "반려"; reason?: string };

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`cartrace:${key}`);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function getOperationalAlerts(currentVehicles: Vehicle[], approvalRequests: ApprovalRequest[] = []): OperationalAlert[] {
  const byId = (id: string) => currentVehicles.find((vehicle) => vehicle.id === id);
  const alerts: OperationalAlert[] = [];
  const v1 = byId("v1");
  const v2 = byId("v2");
  const v3 = byId("v3");
  const v4 = byId("v4");
  if (v4?.blocked) alerts.push({ id: "v4", stage: "수출 준비", team: "영업팀", title: "압류·도난 조회 결과 확인", vehicle: `${v4.model} · ${v4.vin.slice(0, 12)}…`, owner: v4.assignee, due: "즉시", impact: "선적 차단", tone: "danger", type: "권리 검증", category: "권리" });
  if (v1?.missing.includes("수출신고필증")) alerts.push({ id: "v1", stage: "수출 준비", team: "영업팀", title: "수출신고필증 미첨부", vehicle: `${v1.model} · ${v1.vin.slice(0, 12)}…`, owner: v1.assignee, due: "선적 전 D-1", impact: "선적 준비 보류", tone: "warning", type: "선적 서류", category: "선적" });
  if (v1?.risk?.includes("권리 재조회")) alerts.push({ id: "v1-rights", stage: "수출 준비", team: "영업팀", title: "선적 전 권리 재조회 필요", vehicle: `${v1.model} · ${v1.vin.slice(0, 12)}…`, owner: v1.assignee, due: "선적 전", impact: "선적 준비 보류", tone: "danger", type: "권리 검증", category: "권리" });
  if (v2?.risk) alerts.push({ id: "v2-amount", stage: "재고", team: "회계팀", title: "계약 금액과 입금액 불일치", vehicle: `${v2.model} · ${v2.vin.slice(0, 12)}…`, owner: v2.assignee, due: "오늘 18:00", impact: "매입 확정 보류", tone: "danger", type: "금액 검증", category: "매입" });
  if (v2?.missing.length) alerts.push({ id: "v2-docs", stage: "재고", team: "회계팀", title: "매입 증빙 미첨부", vehicle: `${v2.model} · ${v2.vin.slice(0, 12)}…`, owner: v2.assignee, due: "매입 확정 전", impact: "매입 확정 보류", tone: "warning", type: "매입 서류", category: "매입" });
  v3?.missing.forEach((document) => alerts.push({ id: `v3-${document}`, stage: "증빙", team: "회계팀", title: `${document} 미첨부`, vehicle: `${v3.model} · ${v3.vin.slice(0, 12)}…`, owner: v3.assignee, due: getEvidenceDeadline(document), impact: "다음 수출 계약 잠금", tone: "warning", type: "사후 증빙", category: "증빙" }));
  currentVehicles.filter((vehicle) => !["v1", "v2", "v3", "v4"].includes(vehicle.id)).forEach((vehicle) => {
    if (vehicle.missing.length) alerts.push({ id: `${vehicle.id}-docs`, stage: vehicle.stage, team: "회계팀", title: `${vehicle.missing[0]} 미첨부`, vehicle: `${vehicle.model} · ${vehicle.vin.slice(0, 12)}…`, owner: vehicle.assignee, due: "매입 확정 전", impact: "매입 확정 보류", tone: "warning", type: "매입 서류", category: "매입", vehicleId: vehicle.id });
    if (vehicle.rights === "미조회") alerts.push({ id: `${vehicle.id}-rights`, stage: vehicle.stage, team: "영업팀", title: "매입 전 권리 조회 필요", vehicle: `${vehicle.model} · ${vehicle.vin.slice(0, 12)}…`, owner: vehicle.assignee, due: "매입 확정 전", impact: "매입 확정 보류", tone: "danger", type: "권리 검증", category: "권리", vehicleId: vehicle.id });
  });
  approvalRequests.filter((request) => request.status === "검토 대기").forEach((request) => {
    const vehicle = byId(request.vehicleId);
    if (vehicle) alerts.push({ id: request.id, stage: request.stage, team: "회계팀", title: `${request.stage} 승인 요청`, vehicle: `${vehicle.model} · ${vehicle.vin.slice(0, 12)}…`, owner: request.reviewer, due: request.due, impact: "검토 전 단계 유지", tone: "warning", type: "승인 검토", category: "매입", vehicleId: vehicle.id });
  });
  return alerts;
}

function App() {
  const [tab, setTab] = useState<"vehicles" | "alerts">("vehicles");
  const initialVehicleId = new URLSearchParams(window.location.search).get("case");
  const initialVehicle = vehicles.find((vehicle) => vehicle.id === initialVehicleId) ?? vehicles[1];
  const [selected, setSelected] = useState(initialVehicle);
  const [filter, setFilter] = useState<Stage | "전체">("전체");
  const [alertMode, setAlertMode] = useState<"vehicle" | "stage">("vehicle");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registeredVehicles, setRegisteredVehicles] = useState<Vehicle[]>(() => readStored("registeredVehicles", []));
  const [stageByVehicle, setStageByVehicle] = useState<Record<string, Stage>>(() => readStored("stageByVehicle", {}));
  const [missingByVehicle, setMissingByVehicle] = useState<Record<string, string[]>>(() => readStored("missingByVehicle", {}));
  const [uploadedFileByVehicle, setUploadedFileByVehicle] = useState<Record<string, string>>(() => readStored("uploadedFileByVehicle", {}));
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(() => readStored("approvalRequests", []));
  const [historyByVehicle, setHistoryByVehicle] = useState<Record<string, HistoryEvent[]>>(() => readStored("historyByVehicle", {}));
  const [approvalRequestedByVehicle, setApprovalRequestedByVehicle] = useState<Record<string, boolean>>({});
  const allVehicles = [...vehicles, ...registeredVehicles];
  const liveVehicles = allVehicles.map((vehicle) => ({ ...vehicle, stage: stageByVehicle[vehicle.id] ?? vehicle.stage, missing: missingByVehicle[vehicle.id] ?? vehicle.missing }));
  const liveSelected = liveVehicles.find((vehicle) => vehicle.id === selected.id) ?? selected;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = liveVehicles.filter((v) => (filter === "전체" || v.stage === filter) && (!normalizedSearch || [v.model, v.vin, v.assignee].some((value) => value.toLowerCase().includes(normalizedSearch))));
  const notificationItems = getOperationalAlerts(liveVehicles, approvalRequests);
const notificationGroups = [{ label: "권리·선적 차단", tone: "danger", count: notificationItems.filter((item) => item.category === "권리" || item.category === "선적").length }, { label: "매입 검증", tone: "danger", count: notificationItems.filter((item) => item.category === "매입").length }, { label: "사후 증빙", tone: "warning", count: notificationItems.filter((item) => item.category === "증빙").length }].filter((group) => group.count > 0);
  useEffect(() => { localStorage.setItem("cartrace:registeredVehicles", JSON.stringify(registeredVehicles)); }, [registeredVehicles]);
  useEffect(() => { localStorage.setItem("cartrace:stageByVehicle", JSON.stringify(stageByVehicle)); }, [stageByVehicle]);
  useEffect(() => { localStorage.setItem("cartrace:missingByVehicle", JSON.stringify(missingByVehicle)); }, [missingByVehicle]);
  useEffect(() => { localStorage.setItem("cartrace:uploadedFileByVehicle", JSON.stringify(uploadedFileByVehicle)); }, [uploadedFileByVehicle]);
  useEffect(() => { localStorage.setItem("cartrace:approvalRequests", JSON.stringify(approvalRequests)); }, [approvalRequests]);
  useEffect(() => { localStorage.setItem("cartrace:historyByVehicle", JSON.stringify(historyByVehicle)); }, [historyByVehicle]);
  const requestApproval = () => {
    const existing = approvalRequests.find((request) => request.vehicleId === liveSelected.id && request.status === "검토 대기");
    if (existing) return;
    const request: ApprovalRequest = { id: `approval-${liveSelected.id}-${Date.now()}`, vehicleId: liveSelected.id, stage: liveSelected.stage, requester: liveSelected.assignee, reviewer: "박정산", requestedAt: "방금 전", due: liveSelected.stage === "증빙" ? "선적 후 14일" : "오늘 18:00", status: "검토 대기" };
    setApprovalRequests((current) => [...current, request]);
    setApprovalRequestedByVehicle((current) => ({ ...current, [liveSelected.id]: true }));
    setHistoryByVehicle((current) => ({
      ...current,
      [liveSelected.id]: [
        ...(current[liveSelected.id] ?? []),
        { id: request.id, at: request.requestedAt, actor: request.requester, action: "승인 요청", reason: `${request.reviewer} 검토 대기` },
      ],
    }));
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="/cartrace-logo.png" alt="CarTrace" /><span><small>smart export ERP</small></span></div>
      <p className="side-label">WORKSPACE</p>
      <button className={tab === "vehicles" ? "nav active" : "nav"} onClick={() => setTab("vehicles")}>▦ <span>차량 업무</span></button>
      <p className="side-hint">미결 알림은 우측 상단 벨에서 확인합니다.</p>
      <div className="side-note"><i /> <span><b>오늘의 운영 기준</b><small>되돌릴 수 없는 손해는 막고, 회수 가능한 손해는 미결로 남깁니다.</small></span></div>
      <div className="user"><b>박</b><span>박정산<small>회계팀</small></span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p>스마트 중고차 수출 ERP 시스템</p><h1>{tab === "vehicles" ? "차량 업무" : "미결·알림"}</h1></div><div className="top-actions"><span className="sync">마지막 동기화 11:04</span><div className="notification-wrap"><button className="bell" aria-label="미결 알림" aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><b>{notificationItems.length}</b></button>{notificationOpen && <div className="notification-popover"><div className="notification-head"><strong>미결 알림</strong><span>{notificationItems.length}건</span></div><div className="notification-summary">{notificationGroups.map((group) => <span key={group.label}><i className={group.tone} />{group.label} <b>{group.count}</b></span>)}</div>{notificationItems.map((item) => <button className="notification-item" key={item.id} onClick={() => { const found = allVehicles.find((v) => v.id === (item.vehicleId ?? item.id.split("-")[0])); if (found) { setSelected(found); setTab("vehicles"); setNotificationOpen(false); } }}><i className={item.tone} /><span><b>{item.title}</b><small>{item.team} 확인 필요 · {item.vehicle} · {item.impact}</small></span><em>›</em></button>)}<button className="notification-all" onClick={() => { setTab("alerts"); setNotificationOpen(false); }}>전체 알림 보기</button></div>}</div></div></header>
      {tab === "vehicles" ? <>
        <section className="intro"><div><b>차량별 업무 흐름을 한 곳에서 확인하세요.</b><span>막힌 이유와 다음 액션이 먼저 보입니다.</span></div><ProcessFlow current={liveSelected.stage} blocked={liveSelected.blocked ? liveSelected.stage : undefined} /></section>
        <div className="workspace"><section className="list-panel"><div className="panel-title"><div><p>ACTIVE VEHICLES</p><h2>차량 목록 <small>{filtered.length}</small></h2></div><button onClick={() => { setRegistrationError(""); setRegistrationOpen(true); }}>+ 차량 등록</button></div>
          <div className="toolbar"><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="차량명, VIN, 담당자 검색" /><div>{(["전체", "매입", "재고", "수출 준비", "선적", "증빙"] as const).map((s) => <button className={filter === s ? "chosen" : ""} key={s} onClick={() => setFilter(s)}>{s}</button>)}</div></div>
          <div className="table-head"><span>차량 / VIN</span><span>단계</span><span>검증 상태</span><span>담당자</span></div>
          {filtered.length ? filtered.map((vehicle) => <button className={liveSelected.id === vehicle.id ? "vehicle selected" : "vehicle"} key={vehicle.id} onClick={() => setSelected(vehicle)}><span><b>{vehicle.model}</b><small>{vehicle.year} · {vehicle.vin}</small></span><em className={`stage ${vehicle.stage === "수출 준비" ? "수출준비" : vehicle.stage}`}>{vehicle.stage}</em><span className="check"><i className={vehicle.tone ?? "ok"}>{vehicle.tone === "danger" ? "!" : vehicle.tone === "warning" ? "·" : "✓"}</i>{vehicle.risk ?? "검증 완료"}</span><span>{vehicle.assignee}　›</span></button>) : <div className="empty-state">일치하는 차량이 없습니다.<small>차량명, VIN, 담당자 중 하나로 다시 검색해 주세요.</small></div>}
        </section><Detail vehicle={liveSelected} allEvidence={allVehicles.find((item) => item.id === liveSelected.id)?.missing ?? liveSelected.missing} approvalRequested={approvalRequestedByVehicle[liveSelected.id] ?? approvalRequests.some((request) => request.vehicleId === liveSelected.id && request.status === "검토 대기")} uploadedFile={uploadedFileByVehicle[liveSelected.id]} history={historyByVehicle[liveSelected.id] ?? []} onEvidenceUploaded={(vehicle, item, fileName) => { const remaining = vehicle.missing.filter((document) => document !== item); setMissingByVehicle((current) => ({ ...current, [vehicle.id]: remaining })); setUploadedFileByVehicle((current) => ({ ...current, [vehicle.id]: `${item} · ${fileName}` })); setSelected({ ...vehicle, missing: remaining }); }} onRequestApproval={requestApproval} /></div>
        {registrationOpen && <VehicleRegistration onClose={() => setRegistrationOpen(false)} onSubmit={(vehicle) => { if (allVehicles.some((item) => item.vin === vehicle.vin)) { setRegistrationError("이미 등록된 VIN입니다."); return; } setRegisteredVehicles((current) => [...current, vehicle]); setHistoryByVehicle((current) => ({ ...current, [vehicle.id]: [{ id: `history-${vehicle.id}`, at: "방금 전", actor: "김영업", action: "차량 등록", reason: "신규 매입 등록" }] })); setSelected(vehicle); setRegistrationOpen(false); setFilter("전체"); setSearchTerm(""); }} error={registrationError} />}
      </> : <AlertsV2 vehicles={liveVehicles} approvalRequests={approvalRequests} mode={alertMode} onModeChange={setAlertMode} onSelect={(id) => { const found = allVehicles.find((v) => v.id === id.split("-")[0]); if (found) { setSelected(found); setTab("vehicles"); } }} />}
    </main>
  </div>;
}

function getActionState(vehicle: Vehicle, approvalRequested: boolean): { label: string; disabled: boolean } {
  if (vehicle.blocked || vehicle.rights === "압류 이력") return { label: "선적 차단됨 · 권리 해소 필요", disabled: true };
  if (vehicle.risk?.includes("금액")) return { label: "매입 확정 보류 · 금액 검토 필요", disabled: true };
  if (vehicle.risk?.includes("권리")) return { label: "선적 준비 보류 · 권리 재조회 필요", disabled: true };
  if (vehicle.missing.includes("수출신고필증")) return { label: "선적 준비 보류 · 수출신고필증 필요", disabled: true };
  if (vehicle.missing.length) return { label: `서류 구비 미완료 · 증빙 ${vehicle.missing.length}건 필요`, disabled: true };
  if (approvalRequested) return { label: "승인 요청됨 · 검토 대기", disabled: true };
  if (vehicle.stage === "증빙") return { label: "증빙 검토 대기", disabled: true };
  return { label: "승인 요청", disabled: false };
}

function getRequiredDocuments(purchaseType: Vehicle["purchaseType"], paymentType: PaymentType): string[] {
  const base = purchaseType === "딜러" ? ["사업자 정보", "거래명세서"] : purchaseType === "개인" ? ["소유권 확인 자료"] : ["낙찰 확인서", "경매 거래 명세"];
  return [...base, paymentType === "현금" ? "현금 지급 확인 자료" : paymentType === "계산서" ? "계산서" : paymentType === "경매 결제" ? "경매 결제 증빙" : "지급 증빙"];
}

function VehicleRegistration({ onClose, onSubmit, error }: { onClose: () => void; onSubmit: (vehicle: Vehicle) => void; error: string }) {
  const [form, setForm] = useState({ model: "", vin: "", year: "2022", contractAmount: "", paymentAmount: "", purchaseType: "딜러" as Vehicle["purchaseType"], paymentType: "계좌이체" as PaymentType });
  const [formError, setFormError] = useState("");
  const required = ["매입 계약서", ...getRequiredDocuments(form.purchaseType, form.paymentType)];
  const submit = () => {
    if (!form.model.trim()) return setFormError("차량명을 입력해 주세요.");
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(form.vin)) return setFormError("VIN은 제외 문자를 확인한 17자리 형식이어야 합니다.");
    if (!form.contractAmount || !form.paymentAmount) return setFormError("계약 금액과 지급액을 입력해 주세요.");
    onSubmit({ id: `new-${Date.now()}`, model: form.model, vin: form.vin, year: Number(form.year) || 2022, purchaseType: form.purchaseType, paymentType: form.paymentType, stage: "매입", assignee: "김영업", missing: required, amount: "대사 전", rights: "미조회", risk: "필수 정보 검토 필요", tone: "warning", country: "미입력", buyer: "미입력", shipDate: "미정", availableDate: "확인 필요", estimatedMargin: "미정", contractAmount: Number(form.contractAmount), paymentAmount: Number(form.paymentAmount) });
  };
  return <div className="modal-backdrop"><section className="registration-modal"><div className="modal-head"><div><p>NEW VEHICLE</p><h2>차량 등록</h2></div><button aria-label="차량 등록 닫기" onClick={onClose}>×</button></div><div className="registration-grid"><label>차량명<input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="예: 현대 아반떼" /></label><label>VIN<input value={form.vin} onChange={(event) => setForm({ ...form, vin: event.target.value.toUpperCase() })} placeholder="17자리 VIN" /></label><label>연식<input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></label><label>계약 금액<input type="number" value={form.contractAmount} onChange={(event) => setForm({ ...form, contractAmount: event.target.value })} placeholder="원화 금액" /></label><label>지급액<input type="number" value={form.paymentAmount} onChange={(event) => setForm({ ...form, paymentAmount: event.target.value })} placeholder="원화 금액" /></label><label>매입 유형<select value={form.purchaseType} onChange={(event) => setForm({ ...form, purchaseType: event.target.value as Vehicle["purchaseType"] })}><option>딜러</option><option>개인</option><option>경매</option></select></label><label>지급 방식<select value={form.paymentType} onChange={(event) => setForm({ ...form, paymentType: event.target.value as PaymentType })}><option>계좌이체</option><option>현금</option><option>계산서</option><option>경매 결제</option></select></label></div><div className="registration-preview"><b>필수 증빙 미리보기</b><span>{required.join(" · ")}</span></div>{(error || formError) && <p className="form-error">{error || formError}</p>}<div className="modal-actions"><button onClick={onClose}>취소</button><button className="primary" onClick={submit}>등록하기</button></div></section></div>;
}

function Detail({ vehicle, allEvidence, approvalRequested, uploadedFile, history, onEvidenceUploaded, onRequestApproval }: { vehicle: Vehicle; allEvidence: string[]; approvalRequested: boolean; uploadedFile?: string; history: HistoryEvent[]; onEvidenceUploaded: (vehicle: Vehicle, item: string, fileName: string) => void; onRequestApproval: () => void }) {
  const action = getActionState(vehicle, approvalRequested);
  const evidenceGroups = [{ label: "매입 확정 전", hint: "매입 타입별 필수", phase: "매입 확정 전" }, { label: "선적 전", hint: "수출 출고 조건", phase: "선적 전" }, { label: "선적 후", hint: "사후 증빙 마감", phase: "선적 후" }].map((group) => ({ ...group, items: allEvidence.filter((item) => item !== "매입 계약서" && getEvidencePhase(item) === group.phase) })).filter((group) => group.items.length > 0);
  const contractDone = !vehicle.missing.includes("매입 계약서");
  const formatWon = (value?: number) => value == null ? "미입력" : `₩${value.toLocaleString("ko-KR")}`;
  const amountMismatch = vehicle.contractAmount != null && vehicle.paymentAmount != null && vehicle.contractAmount !== vehicle.paymentAmount;
  const rightsChecked = vehicle.rights !== "미조회";
  return <aside className="detail"><p>VEHICLE DETAIL</p><h2>{vehicle.model}</h2><small className="vin">{vehicle.vin}</small><div className="meta"><span>매입 타입<b>{vehicle.purchaseType}</b></span><span>담당자<b>{vehicle.assignee}</b></span><span>현재 단계<b>{vehicle.stage}</b></span></div><div className="sales-meta"><span>수출 국가<b>{vehicle.country ?? "미정"}</b></span><span>구매자<b>{vehicle.buyer ?? "미정"}</b></span><span>선적 예정<b>{vehicle.shipDate ?? "미정"}</b></span><span>출고 가능<b>{vehicle.availableDate ?? "확인 필요"}</b></span><span>예상 마진<b>{vehicle.estimatedMargin ?? "미정"}</b></span></div><div className={`notice ${vehicle.blocked ? "danger" : vehicle.risk ? "warning" : "success"}`}><b>{vehicle.blocked ? "선적이 차단되어 있습니다" : vehicle.risk ?? "현재 진행 가능한 상태입니다"}</b><small>{vehicle.blocked ? "압류 이력 해소 후 선적할 수 있습니다." : "파일 첨부는 서류 구비 완료만 반영합니다. 검토 후 승인 요청을 보내세요."}</small></div><Block title="증빙 체크리스트" status={`${vehicle.missing.length}건 대기`}><div className="evidence-contract"><Row label="매입 계약서" value={contractDone ? "서류 구비 완료" : "첨부 필요"} done={contractDone} danger={!contractDone} /></div>{evidenceGroups.map((group) => <div className="evidence-group" key={group.label}><div className="evidence-group-title"><b>{group.label}</b><span>{group.hint}</span></div>{group.items.map((item) => { const done = !vehicle.missing.includes(item); return <EvidenceRow key={item} item={item} note={done ? "서류 구비 완료 · 검토 대기" : getEvidenceDeadline(item)} done={done} onUpload={(file) => onEvidenceUploaded(vehicle, item, file.name)} />; })}</div>)}{uploadedFile && <small className="upload-confirm">최근 반영: {uploadedFile}</small>}</Block><Block title="언밸런스 체크" status={vehicle.amount}><Row label="계약 금액" value={formatWon(vehicle.contractAmount)} /><Row label="실제 지급액" value={formatWon(vehicle.paymentAmount)} danger={amountMismatch} note={amountMismatch ? `차액 ${formatWon((vehicle.contractAmount ?? 0) - (vehicle.paymentAmount ?? 0))}` : undefined} /><Row label="인보이스 / 환율" value={vehicle.invoiceUsd != null && vehicle.exchangeRate != null ? `USD ${vehicle.invoiceUsd.toLocaleString()} · ${vehicle.exchangeRate.toLocaleString()}원 (${vehicle.exchangeRateDate ?? "기준일 미입력"})` : "미입력"} /></Block><Block title="권리 조회" status={vehicle.rights}><Row label="매입 전 조회" value={rightsChecked ? `${vehicle.rights} · 11/24` : "미조회"} done={rightsChecked && vehicle.rights === "정상"} danger={!rightsChecked} /><Row label="선적 전 조회" value={vehicle.rights} danger={vehicle.blocked || vehicle.rights !== "정상"} /></Block><Block title="업무 흐름" status="현재 위치"><ProcessFlow current={vehicle.stage} blocked={vehicle.blocked ? vehicle.stage : undefined} compact /></Block><Block title="상태 변경 이력" status={history.length ? "기록" : "기록 없음"}><History events={history} /></Block><button className={action.disabled ? "action blocked" : "action"} disabled={action.disabled} onClick={onRequestApproval}>{action.label}</button></aside>;
}

function History({ events }: { events: HistoryEvent[] }) {
  return <div className="history">{events.length ? events.map((event) => <div className="history-item" key={event.id}><time>{event.at}</time><span><b>{event.action}</b><small>{event.actor}{event.reason ? ` · ${event.reason}` : ""}</small></span></div>) : <small className="history-empty">아직 확인·변경 기록이 없습니다.</small>}</div>;
}

function getNextStage(stage: Stage): Stage { const stages: Stage[] = ["매입", "재고", "수출 준비", "선적", "증빙"]; return stages[Math.min(stages.indexOf(stage) + 1, stages.length - 1)]; }

function ProcessFlow({ current, blocked, compact = false }: { current: Stage; blocked?: Stage; compact?: boolean }) { const stages: Stage[] = ["매입", "재고", "수출 준비", "선적", "증빙"]; const currentIndex = stages.indexOf(current); return <div className={compact ? "process-flow compact" : "process-flow"}>{stages.map((stage, index) => <div className={stage === blocked ? "process-step blocked" : index < currentIndex ? "process-step complete" : stage === current ? "process-step current" : "process-step"} key={stage}><div className="process-track"><span className="process-node">{index < currentIndex ? "✓" : index + 1}</span>{index < stages.length - 1 && <i className={`${index < currentIndex ? "process-connector complete" : "process-connector"}${stages[index + 1] === blocked ? " blocked-segment" : ""}`} />}</div><b>{stage}</b></div>)}</div>; }

function Block({ title, status, children }: { title: string; status: string; children: React.ReactNode }) { return <section className="block"><div className="block-title"><h3>{title}</h3><span>{status}</span></div>{children}</section>; }
function Row({ label, value, done, danger, note }: { label: string; value: string; done?: boolean; danger?: boolean; note?: string }) { return <div className="row"><span><i className={done ? "done" : ""}>{done ? "✓" : ""}</i><span className="row-copy"><b>{label}</b>{note && <small>{note}</small>}</span></span><b className={danger ? "negative" : ""}>{value}</b></div>; }
function EvidenceRow({ item, note, done, onUpload }: { item: string; note: string; done?: boolean; onUpload: (file: File) => void }) { return <div className="row evidence-row"><span><i className={done ? "done" : ""}>{done ? "✓" : ""}</i> <span className="row-copy"><b>{item}</b><small>{note}</small></span></span>{done ? <span className="evidence-status done">서류 구비 완료</span> : <span className="evidence-action"><b>첨부 필요</b><label className="row-upload" title={`${item} 파일 업로드`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4" /></svg><input type="file" aria-label={`${item} 파일 업로드`} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} /></label></span>}</div>; }
function getEvidencePhase(item: string): "매입 확정 전" | "선적 전" | "선적 후" { if (["매입 계약서", "사업자 정보", "거래명세서", "소유권 확인 자료", "낙찰 확인서", "경매 거래 명세", "지급 증빙", "현금 지급 확인 자료", "계산서", "경매 결제 증빙"].includes(item)) return "매입 확정 전"; if (item === "수출신고필증") return "선적 전"; return "선적 후"; }
function getEvidenceDeadline(item: string): string { const deadlines: Record<string, string> = { "수출신고필증": "선적 전 · 보완 마감 D-1", "소유권 확인 자료": "매입 확정 전 · 오늘 18:00", "지급 증빙": "매입 확정 전 · 오늘 18:00", "B/L": "선적 후 · 7일 이내", "외화 입금증명": "선적 후 · 14일 이내" }; return deadlines[item] ?? "단계별 담당자 확인 필요"; }
function Alerts({ onSelect }: { onSelect: (id: string) => void }) { const alerts = [{ id: "v4", type: "하드 게이트", title: "압류 이력 발견", vehicle: "혼다 어코드 · JHMCM565…", owner: "김영업", due: "즉시", impact: "선적 차단", tone: "danger" }, { id: "v2", type: "금액 불일치", title: "계약 금액과 입금액 불일치", vehicle: "기아 봉고 III · KMHWA81…", owner: "박정산", due: "오늘 18:00", impact: "매입 확정 보류", tone: "danger" }, { id: "v3", type: "증빙 미결", title: "B/L·외화 입금증명 미첨부", vehicle: "폭스바겐 골프 · WVWZZZ1…", owner: "최회계", due: "D-2", impact: "다음 수출 계약 잠금", tone: "warning" }]; return <section className="alerts"><p>WORK QUEUE</p><h2>지금 확인이 필요한 업무</h2><span>알림은 경고가 아니라 다음 행동을 정하는 업무 큐입니다.</span><div className="alert-list">{alerts.map((a) => <button onClick={() => onSelect(a.id)} className="alert" key={a.id}><em className={a.tone}>{a.tone === "danger" ? "차단" : "미결"}</em><strong>{a.title}<small>{a.type} · {a.vehicle}</small></strong><span>담당자<b>{a.owner}</b></span><span>기한<b>{a.due}</b></span><span>미처리 시<b>{a.impact}</b></span>›</button>)}</div></section>; }

function AlertsV2({ vehicles: currentVehicles, approvalRequests, mode, onModeChange, onSelect }: { vehicles: Vehicle[]; approvalRequests: ApprovalRequest[]; mode: "vehicle" | "stage"; onModeChange: (mode: "vehicle" | "stage") => void; onSelect: (id: string) => void }) {
  const alerts = getOperationalAlerts(currentVehicles, approvalRequests);
  const stages: Stage[] = ["매입", "재고", "수출 준비", "선적", "증빙"];
  const stageItems = stages.map((stage) => ({ stage, items: alerts.filter((alert) => alert.stage === stage) }));
  return <section className="alerts"><div className="alerts-header"><div className="alerts-copy"><p>WORK QUEUE</p><h2>지금 확인이 필요한 업무</h2><span>차량 또는 업무 단계 기준으로 미결의 위치와 담당 팀을 확인합니다.</span></div><div className="alert-tabs" aria-label="알림 보기 기준"><button className={mode === "vehicle" ? "active" : ""} onClick={() => onModeChange("vehicle")}>차량 기준</button><button className={mode === "stage" ? "active" : ""} onClick={() => onModeChange("stage")}>단계 기준</button></div></div>{mode === "vehicle" ? <div className="alert-list">{alerts.map((alert) => <button onClick={() => onSelect(alert.vehicleId ?? alert.id)} className="alert vehicle-alert" key={alert.id}><StageLine blocked={alert.stage} /><em className={alert.tone}>{alert.tone === "danger" ? "차단" : "미결"}</em><strong>{alert.title}<small>{alert.vehicle}</small></strong><span className="team-owner"><b className={`team ${alert.team === "영업팀" ? "sales" : "accounting"}`}>{alert.team} 확인 필요</b><small>담당자 {alert.owner}</small></span><span>기한<b>{alert.due}</b></span><span>미처리 시<b>{alert.impact}</b></span>›</button>)}</div> : <div className="stage-alert-list">{stageItems.map(({ stage, items }) => <div className={items.length ? "stage-alert active" : "stage-alert"} key={stage}><div className="stage-title"><b>{stage}</b><small>{items.length ? `${items.length}건이 이 단계에서 멈춤` : "미결 없음"}</small></div><StageLine blocked={items[0]?.stage} />{items.map((item) => <button onClick={() => onSelect(item.vehicleId ?? item.id)} className="stage-alert-item" key={item.id}><span><b className={`team ${item.team === "영업팀" ? "sales" : "accounting"}`}>{item.team}</b>{item.title}<small>{item.vehicle} · {item.owner}</small></span><strong>{item.due}</strong>›</button>)}</div>)}</div>}</section>;
}

function StageLine({ blocked }: { blocked?: Stage }) { const stages: Stage[] = ["매입", "재고", "수출 준비", "선적", "증빙"]; return <div className="stage-line">{stages.map((stage, index) => <span className={blocked === stage ? "line-node blocked" : "line-node"} key={stage}><i /><small>{stage}</small>{index < stages.length - 1 && <b className={`${blocked === stage || (index < stages.indexOf(blocked ?? "매입")) ? "line-segment lit" : "line-segment"}${stages[index + 1] === blocked ? " stage-alert-segment" : ""}`} />}</span>)}</div>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
