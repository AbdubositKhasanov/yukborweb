import { useState, useEffect, useRef } from 'react';
import {
  listUserbots,
  checkUserbotStatus,
  addUserbot,
  verifyUserbotCode,
  verifyUserbotPassword,
  removeUserbot,
  getUserMe,
  getGroupMonitoringStats,
  getUserbotHealth,
  getBannedGroups,
  clearBannedGroups,
  getUserbotGroups,
  updateUserbotGroupPermissions,
  joinUserbotGroup,
  autoJoinUserbotGroup,
  getDuplicateUserbotGroups,
  resolveDuplicateUserbotGroup,
  importUserbotGroupJoinQueue,
  getUserbotGroupJoinQueue,
  approveUserbotGroupJoinQueue,
  rejectUserbotGroupJoinQueue,
  leaveUserbotGroup,
  cleanupUnavailableUserbotGroups,
  selectAllUserbotGroups,
} from '../services/api';

// ============================================
// ADMIN PAGE STATES
// ============================================
const VIEWS = {
  USERBOTS: 'userbots',
  ADD_FORM: 'add_form',
  VERIFY_CODE: 'verify_code',
  VERIFY_PASSWORD: 'verify_password',
  GROUPS: 'groups',
  MONITORING: 'monitoring',
};

const GROUP_QUEUE_STATUS = {
  pending: { label: 'Tasdiq kutilmoqda', color: '#856404', background: '#fff3cd' },
  processing: { label: "Qo'shilmoqda", color: '#004085', background: '#cce5ff' },
  joined: { label: "Qo'shildi", color: '#155724', background: '#d4edda' },
  rejected: { label: 'Rad etildi', color: '#721c24', background: '#f8d7da' },
  failed: { label: 'Xatolik', color: '#721c24', background: '#f8d7da' },
};

const getTelegramGroupUrl = (target) => {
  const value = String(target || '').trim();
  if (/^@[A-Za-z][A-Za-z0-9_]{3,31}$/.test(value)) {
    return `https://t.me/${value.slice(1)}`;
  }
  if (/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i.test(value)) {
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }
  if (/^tg:\/\/join\?invite=[A-Za-z0-9_-]+$/i.test(value)) {
    return value;
  }
  return null;
};

export default function UserbotManagementPage() {
  // Core state
  const [view, setView] = useState(VIEWS.USERBOTS);
  const [userbots, setUserbots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add userbot form
  const [addPhone, setAddPhone] = useState('');
  const [addApiId, setAddApiId] = useState('');
  const [addApiHash, setAddApiHash] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Verification
  const [verifyPhone, setVerifyPhone] = useState(null);
  const [verifyCodeVal, setVerifyCodeVal] = useState('');
  const [verifyPasswordVal, setVerifyPasswordVal] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Status check
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Monitoring stats
  const [monitoringStats, setMonitoringStats] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const monitoringPollRef = useRef(null);

  // Banned groups
  const [bannedGroups, setBannedGroups] = useState([]);
  const [bannedLoading, setBannedLoading] = useState(false);
  const [clearingBanned, setClearingBanned] = useState(false);

  // Admin-managed groups
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupPhoneFilter, setGroupPhoneFilter] = useState('all');
  const [groupPermissionFilter, setGroupPermissionFilter] = useState('all');
  const [updatingGroupKey, setUpdatingGroupKey] = useState(null);
  const [showJoinGroupForm, setShowJoinGroupForm] = useState(false);
  const [joinGroupPhone, setJoinGroupPhone] = useState('auto');
  const [joinGroupTarget, setJoinGroupTarget] = useState('');
  const [joinGroupLoading, setJoinGroupLoading] = useState(false);
  const [leavingGroupKey, setLeavingGroupKey] = useState(null);
  const [cleaningUnavailableGroups, setCleaningUnavailableGroups] = useState(false);
  const [selectingAllGroups, setSelectingAllGroups] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [duplicateGroupsLoading, setDuplicateGroupsLoading] = useState(false);
  const [duplicateKeepPhones, setDuplicateKeepPhones] = useState({});
  const [resolvingDuplicateGroupId, setResolvingDuplicateGroupId] = useState(null);
  const [groupJoinQueue, setGroupJoinQueue] = useState([]);
  const [groupJoinQueueLoading, setGroupJoinQueueLoading] = useState(false);
  const [groupQueueInput, setGroupQueueInput] = useState('');
  const [groupQueueImporting, setGroupQueueImporting] = useState(false);
  const [groupQueueActionId, setGroupQueueActionId] = useState(null);
  const [groupQueuePhones, setGroupQueuePhones] = useState({});

  // Auto-clear messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Initial load
  useEffect(() => {
    loadData();
    return () => {
      if (monitoringPollRef.current) clearInterval(monitoringPollRef.current);
    };
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadData = async () => {
    setLoading(true);
    try {
      const userRes = await getUserMe();
      if (userRes.code === 200 && userRes.result) {
        setIsAdmin(userRes.result.isAdmin === true);
      }
      const res = await listUserbots();
      if (res.success) {
        setUserbots(res.userbots || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoringStats = async () => {
    setMonitoringLoading(true);
    try {
      const [statsRes, healthRes, bannedRes] = await Promise.all([
        getGroupMonitoringStats(),
        getUserbotHealth(),
        getBannedGroups(),
      ]);
      setMonitoringStats(statsRes);
      setHealthData(healthRes);
      setBannedGroups(bannedRes.banned_groups || []);
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || 'Monitoring yuklanmadi'
      );
    } finally {
      setMonitoringLoading(false);
    }
  };

  const handleClearBannedGroups = async (phone = null) => {
    const msg = phone
      ? `${phone} uchun bloklangan guruhlarni tozalashni tasdiqlaysizmi?`
      : 'Barcha bloklangan guruhlarni tozalashni tasdiqlaysizmi?';
    if (!window.confirm(msg)) return;

    setClearingBanned(true);
    try {
      const res = await clearBannedGroups(phone);
      if (res.success) {
        setSuccessMsg(res.message);
        setBannedGroups(phone ? bannedGroups.filter((g) => g.phone !== phone) : []);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Tozalashda xatolik');
    } finally {
      setClearingBanned(false);
    }
  };

  const loadGroups = async (refresh = false) => {
    setGroupsLoading(true);
    try {
      const res = await getUserbotGroups(refresh);
      if (res.success) {
        setGroups(res.groups || []);
        if (refresh) {
          setSuccessMsg(
            res.synced_userbots > 0
              ? `${res.synced_userbots} ta userbot guruhlari yangilandi`
              : 'Saqlangan guruhlar yuklandi'
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Guruhlar yuklanmadi'
      );
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadDuplicateGroups = async (refresh = false) => {
    setDuplicateGroupsLoading(true);
    try {
      const res = await getDuplicateUserbotGroups(refresh);
      if (res.success) {
        const foundGroups = res.groups || [];
        setDuplicateGroups(foundGroups);
        setDuplicateKeepPhones((previous) => {
          const next = {};
          foundGroups.forEach((duplicate) => {
            const phones = (duplicate.connections || []).map(
              (connection) => connection.phone
            );
            next[duplicate.group_id] = phones.includes(previous[duplicate.group_id])
              ? previous[duplicate.group_id]
              : phones[0] || '';
          });
          return next;
        });
        if (refresh) setSuccessMsg(res.message);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Dublikat guruhlarni topishda xatolik'
      );
    } finally {
      setDuplicateGroupsLoading(false);
    }
  };

  const loadGroupJoinQueue = async () => {
    setGroupJoinQueueLoading(true);
    try {
      const res = await getUserbotGroupJoinQueue();
      if (res.success) setGroupJoinQueue(res.items || []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Guruhlar navbati yuklanmadi"
      );
    } finally {
      setGroupJoinQueueLoading(false);
    }
  };

  const handleOpenGroups = async () => {
    handleCloseMonitoring();
    setView(VIEWS.GROUPS);
    await loadGroups(true);
    await Promise.all([loadDuplicateGroups(false), loadGroupJoinQueue()]);
  };

  const handleResolveDuplicateGroup = async (duplicate) => {
    const connections = duplicate.connections || [];
    const keepPhone =
      duplicateKeepPhones[duplicate.group_id] || connections[0]?.phone;
    if (!keepPhone) {
      setError('Guruhda qoldiriladigan userbotni tanlang');
      return;
    }

    const removePhones = connections
      .map((connection) => connection.phone)
      .filter((phone) => phone !== keepPhone);
    if (
      !window.confirm(
        `${duplicate.title || duplicate.group_id}: ${keepPhone} guruhda qoladi. ` +
          `${removePhones.length} ta boshqa userbot guruhdan chiqarilsinmi?`
      )
    ) {
      return;
    }

    setResolvingDuplicateGroupId(duplicate.group_id);
    try {
      const res = await resolveDuplicateUserbotGroup(
        duplicate.group_id,
        keepPhone
      );
      await Promise.all([loadGroups(false), loadDuplicateGroups(false)]);
      if (res.success) {
        setSuccessMsg(res.message || 'Dublikat ulanishlar olib tashlandi');
      } else {
        const failures = (res.failed_connections || [])
          .map((item) => `${item.phone}: ${item.error}`)
          .join('; ');
        setError(
          `${res.message || 'Ayrim ulanishlarni olib tashlab bo‘lmadi'}` +
            (failures ? ` — ${failures}` : '')
        );
      }
    } catch (err) {
      await loadDuplicateGroups(false);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Dublikat ulanishlarni olib tashlashda xatolik'
      );
    } finally {
      setResolvingDuplicateGroupId(null);
    }
  };

  const handleImportGroupQueue = async () => {
    const targets = groupQueueInput
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (targets.length === 0) {
      setError("Kamida bitta @username yoki invite-link kiriting");
      return;
    }

    setGroupQueueImporting(true);
    try {
      const res = await importUserbotGroupJoinQueue(targets);
      if (res.success) {
        await loadGroupJoinQueue();
        if ((res.invalid || []).length === 0) setGroupQueueInput('');
        setSuccessMsg(
          `${res.imported_count || 0} ta yangi guruh bazaga saqlandi, ` +
            `${res.existing_count || 0} ta avval mavjud`
        );
        if ((res.invalid || []).length > 0) {
          setError(`Noto'g'ri qatorlar: ${res.invalid.join('; ')}`);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Ro'yxatni bazaga saqlashda xatolik"
      );
    } finally {
      setGroupQueueImporting(false);
    }
  };

  const handleApproveGroupQueue = async (item) => {
    const selectedPhone = groupQueuePhones[item.id] || 'auto';
    const assignee =
      selectedPhone === 'auto'
        ? 'guruhlari eng kam userbot'
        : selectedPhone;
    if (
      !window.confirm(
        `${item.target} guruhini ${assignee} orqali qo'shishni tasdiqlaysizmi?`
      )
    ) {
      return;
    }

    setGroupQueueActionId(item.id);
    try {
      const res = await approveUserbotGroupJoinQueue(
        item.id,
        selectedPhone === 'auto' ? null : selectedPhone
      );
      if (res.success) {
        await Promise.all([
          loadGroupJoinQueue(),
          loadGroups(false),
          loadDuplicateGroups(false),
        ]);
        setSuccessMsg(res.message || "Guruh tasdiqlandi va qo'shildi");
      }
    } catch (err) {
      await loadGroupJoinQueue();
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Guruhni tasdiqlashda xatolik"
      );
    } finally {
      setGroupQueueActionId(null);
    }
  };

  const handleRejectGroupQueue = async (item) => {
    if (!window.confirm(`${item.target} guruhini qo'shmasdan rad etasizmi?`)) return;

    setGroupQueueActionId(item.id);
    try {
      const res = await rejectUserbotGroupJoinQueue(item.id);
      if (res.success) {
        await loadGroupJoinQueue();
        setSuccessMsg(res.message || "Guruh rad etildi");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Guruhni rad etishda xatolik"
      );
    } finally {
      setGroupQueueActionId(null);
    }
  };

  const handleGroupPermissionChange = async (group, permission, value) => {
    const key = `${group.phone}:${group.group_id}:${permission}`;
    setUpdatingGroupKey(key);
    try {
      const res = await updateUserbotGroupPermissions({
        phone: group.phone,
        groupId: group.group_id,
        ...(permission === 'can_read' ? { canRead: value } : { canSend: value }),
      });
      if (res.success && res.group) {
        setGroups((prev) =>
          prev.map((item) =>
            item.phone === res.group.phone && item.group_id === res.group.group_id
              ? res.group
              : item
          )
        );
        setSuccessMsg('Guruh ruxsati saqlandi');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Ruxsatni saqlashda xatolik'
      );
    } finally {
      setUpdatingGroupKey(null);
    }
  };

  const replaceGroupInState = (updatedGroup) => {
    setGroups((prev) => {
      const exists = prev.some(
        (item) =>
          item.phone === updatedGroup.phone && item.group_id === updatedGroup.group_id
      );
      if (!exists) return [updatedGroup, ...prev];
      return prev.map((item) =>
        item.phone === updatedGroup.phone && item.group_id === updatedGroup.group_id
          ? updatedGroup
          : item
      );
    });
  };

  const handleOpenJoinGroupForm = (target = '') => {
    setJoinGroupPhone('auto');
    setJoinGroupTarget(target);
    setShowJoinGroupForm(true);
  };

  const handleJoinGroup = async (event) => {
    event.preventDefault();
    if (!joinGroupTarget.trim()) {
      setError('Guruh username yoki linkini kiriting');
      return;
    }

    setJoinGroupLoading(true);
    try {
      const res =
        joinGroupPhone === 'auto'
          ? await autoJoinUserbotGroup(joinGroupTarget.trim())
          : await joinUserbotGroup(joinGroupPhone, joinGroupTarget.trim());
      if (res.success && res.group) {
        replaceGroupInState(res.group);
        setSuccessMsg(res.message || "Userbot guruhga qo'shildi");
        setShowJoinGroupForm(false);
        setJoinGroupPhone('auto');
        setJoinGroupTarget('');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Guruhga qo'shishda xatolik"
      );
    } finally {
      setJoinGroupLoading(false);
    }
  };

  const handleCleanupUnavailableGroups = async () => {
    if (
      !window.confirm(
        `${disconnectedGroups} ta chiqarilgan guruh yozuvini ro'yxatdan butunlay tozalamoqchimisiz?`
      )
    ) {
      return;
    }

    setCleaningUnavailableGroups(true);
    try {
      const res = await cleanupUnavailableUserbotGroups();
      if (res.success) {
        await loadGroups(false);
        setSuccessMsg(res.message || 'Chiqarilgan guruhlar tozalandi');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Chiqarilgan guruhlarni tozalashda xatolik'
      );
    } finally {
      setCleaningUnavailableGroups(false);
    }
  };

  const handleLeaveGroup = async (group) => {
    if (
      !window.confirm(
        `${group.phone} userbotni "${group.title}" guruhidan chiqarmoqchimisiz?`
      )
    ) {
      return;
    }

    const key = `${group.phone}:${group.group_id}`;
    setLeavingGroupKey(key);
    try {
      const res = await leaveUserbotGroup(group.phone, group.group_id);
      if (res.success && res.group) {
        replaceGroupInState(res.group);
        setSuccessMsg(res.message || 'Userbot guruhdan chiqarildi');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Guruhdan chiqarishda xatolik'
      );
    } finally {
      setLeavingGroupKey(null);
    }
  };

  const handleSelectAllGroups = async () => {
    if (
      !window.confirm(
        "Barcha guruhlarda xabarlarni o'qish va xabar yuborishni yoqmoqchimisiz?"
      )
    ) {
      return;
    }

    setSelectingAllGroups(true);
    try {
      const res = await selectAllUserbotGroups();
      if (!res.success) {
        throw new Error(res.message || 'Server guruhlarni belgilamadi');
      }

      // Bulk endpointning o'zi MongoDB'dan qayta o'qigan guruhlarni qaytaradi.
      // Bu contract bo'lmasa backend hali eski versiyada ishlayotgan bo'ladi.
      if (!Array.isArray(res.groups)) {
        throw new Error('Backendning guruh ruxsatlari versiyasi eskirgan');
      }
      const bulkKeys = new Set(
        res.groups.map((group) => `${group.phone}:${group.group_id}`)
      );
      const missingFromBulk = groups.filter(
        (group) => !bulkKeys.has(`${group.phone}:${group.group_id}`)
      );
      const unselectedInBulk = res.groups.filter(
        (group) => !group.can_read || !group.can_send
      );
      if (missingFromBulk.length > 0 || unselectedInBulk.length > 0) {
        throw new Error(
          `Bulk javobida ${missingFromBulk.length} ta yo'q, ${unselectedInBulk.length} ta belgilanmagan guruh bor`
        );
      }

      // Lokal state'ni taxminan o'zgartirmaymiz. Oddiy GET bilan qayta o'qish
      // browser refresh qilganda ham aynan shu qiymatlar kelishini kafolatlaydi.
      const verification = await getUserbotGroups(false);
      const persistedGroups = verification.groups || [];
      const persistedKeys = new Set(
        persistedGroups.map((group) => `${group.phone}:${group.group_id}`)
      );
      const missingGroups = groups.filter(
        (group) => !persistedKeys.has(`${group.phone}:${group.group_id}`)
      );
      const unselectedGroups = persistedGroups.filter(
        (group) => !group.can_read || !group.can_send
      );
      if (
        !verification.success ||
        missingGroups.length > 0 ||
        unselectedGroups.length > 0
      ) {
        throw new Error(
          `Tekshiruvda ${missingGroups.length} ta yo'q, ${unselectedGroups.length} ta belgilanmagan guruh qaytdi`
        );
      }

      setGroups(persistedGroups);
      setSuccessMsg(
        `${persistedGroups.length} ta guruhda o'qish va xabar yuborish saqlandi`
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Barcha guruhlarni belgilashda xatolik'
      );
    } finally {
      setSelectingAllGroups(false);
    }
  };

  // ============================================
  // ACTION HANDLERS
  // ============================================
  const handleCheckStatus = async () => {
    if (userbots.length === 0) return;
    setCheckingStatus(true);
    try {
      const phones = userbots.map((u) => u.phone);
      const res = await checkUserbotStatus(phones);
      if (res.success && res.statuses) {
        setUserbots((prev) =>
          prev.map((ub) => {
            const fresh = res.statuses.find((s) => s.phone === ub.phone);
            return fresh ? { ...ub, ...fresh } : ub;
          })
        );
        setSuccessMsg('Statuslar yangilandi');
      }
    } catch (err) {
      setError('Status tekshirishda xatolik');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleAddUserbot = async (e) => {
    e.preventDefault();
    if (!addPhone || !addApiId || !addApiHash) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    setAddLoading(true);
    setError(null);
    try {
      const res = await addUserbot(addPhone, parseInt(addApiId), addApiHash);
      if (res.success && res.requires_code) {
        setVerifyPhone(addPhone);
        setView(VIEWS.VERIFY_CODE);
        setAddPhone('');
        setAddApiId('');
        setAddApiHash('');
      } else if (res.success) {
        setSuccessMsg("Userbot muvaffaqiyatli qo'shildi");
        setView(VIEWS.USERBOTS);
        setAddPhone('');
        setAddApiId('');
        setAddApiHash('');
        loadData();
      } else {
        setError(res.message || 'Xatolik');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Xatolik'
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError(null);
    try {
      const res = await verifyUserbotCode(verifyPhone, verifyCodeVal);
      if (res.success && res.is_authorized) {
        setSuccessMsg('Userbot muvaffaqiyatli autorizatsiya qilindi!');
        resetVerification();
        loadData();
      } else if (res.requires_password) {
        setView(VIEWS.VERIFY_PASSWORD);
        setVerifyCodeVal('');
      } else {
        setError(res.message || "Kod noto'g'ri");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Xatolik'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError(null);
    try {
      const res = await verifyUserbotPassword(verifyPhone, verifyPasswordVal);
      if (res.success && res.is_authorized) {
        setSuccessMsg('Userbot muvaffaqiyatli autorizatsiya qilindi!');
        resetVerification();
        loadData();
      } else {
        setError(res.message || "Parol noto'g'ri");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Xatolik'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRemove = async (phone) => {
    if (!window.confirm(`${phone} userbotni o'chirmoqchimisiz?`)) return;
    try {
      const res = await removeUserbot(phone);
      if (res.success) {
        setSuccessMsg(`${phone} o'chirildi`);
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "O'chirishda xatolik");
    }
  };

  const resetVerification = () => {
    setVerifyPhone(null);
    setVerifyCodeVal('');
    setVerifyPasswordVal('');
    setView(VIEWS.USERBOTS);
  };

  const handleOpenMonitoring = () => {
    if (monitoringPollRef.current) clearInterval(monitoringPollRef.current);
    setView(VIEWS.MONITORING);
    loadMonitoringStats();
    monitoringPollRef.current = setInterval(loadMonitoringStats, 10000);
  };

  const handleCloseMonitoring = () => {
    setView(VIEWS.USERBOTS);
    if (monitoringPollRef.current) {
      clearInterval(monitoringPollRef.current);
      monitoringPollRef.current = null;
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  if (loading) {
    return (
      <div className="container">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="error-message">Bu sahifa faqat adminlar uchun</div>
      </div>
    );
  }

  const getStatusBadge = (st) => {
    const config = {
      active: { bg: '#d4edda', color: '#155724', label: 'Aktiv' },
      banned: { bg: '#f8d7da', color: '#721c24', label: 'Bloklangan' },
      error: { bg: '#f8d7da', color: '#721c24', label: 'Xato' },
      unauthorized: { bg: '#fff3cd', color: '#856404', label: 'Avtorizatsiya kerak' },
      disconnected: { bg: '#e2e3e5', color: '#383d41', label: 'Uzilgan' },
    };
    const c = config[st] || config.disconnected;
    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: '600',
          backgroundColor: c.bg,
          color: c.color,
        }}
      >
        {c.label}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isUserbotView =
    view === VIEWS.USERBOTS || view === VIEWS.ADD_FORM;
  const activeUserbots = userbots.filter((userbot) => userbot.status === 'active');
  const userbotPhones = [...new Set(groups.map((group) => group.phone))];
  const connectedGroups = groups.filter((group) => group.is_available);
  const activeGroupCounts = connectedGroups.reduce((counts, group) => {
    counts[group.phone] = (counts[group.phone] || 0) + 1;
    return counts;
  }, {});
  const readableGroups = connectedGroups.filter((group) => group.can_read).length;
  const sendableGroups = connectedGroups.filter((group) => group.can_send).length;
  const disconnectedGroups = groups.filter((group) => !group.is_available).length;
  const filteredGroups = groups.filter((group) => {
    if (groupPhoneFilter !== 'all' && group.phone !== groupPhoneFilter) return false;
    if (groupPermissionFilter === 'read' && (!group.can_read || !group.is_available)) return false;
    if (groupPermissionFilter === 'send' && (!group.can_send || !group.is_available)) return false;
    if (groupPermissionFilter === 'inactive' && group.is_available) return false;
    if (
      groupPermissionFilter === 'disabled' &&
      (group.can_read || group.can_send || !group.is_available)
    ) {
      return false;
    }

    const query = groupSearch.trim().toLocaleLowerCase('uz-UZ');
    if (!query) return true;
    return [group.title, group.username, group.phone, String(group.group_id)].some((value) =>
      String(value || '')
        .toLocaleLowerCase('uz-UZ')
        .includes(query)
    );
  });

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="container">
      {/* Toast messages */}
      {successMsg && (
        <div style={toastSuccessStyle}>{successMsg}</div>
      )}
      {error && (
        <div style={toastErrorStyle}>{error}</div>
      )}

      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Userbotlar boshqaruvi
        </h1>
      </div>

      {/* TAB BUTTONS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => {
            handleCloseMonitoring();
            setView(VIEWS.USERBOTS);
          }}
          style={{
            ...tabBtnStyle,
            ...(isUserbotView ? tabBtnActiveStyle : {}),
          }}
        >
          Userbotlar ({userbots.length})
        </button>

        <button
          onClick={handleOpenGroups}
          style={{
            ...tabBtnStyle,
            ...(view === VIEWS.GROUPS ? tabBtnActiveStyle : {}),
          }}
        >
          Guruhlar ({connectedGroups.length})
        </button>

        <button
          onClick={handleOpenMonitoring}
          style={{
            ...tabBtnStyle,
            ...(view === VIEWS.MONITORING ? tabBtnActiveStyle : {}),
          }}
        >
          Guruh monitoring
        </button>

        {/* Action buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {view === VIEWS.USERBOTS && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCheckStatus}
                disabled={checkingStatus || userbots.length === 0}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {checkingStatus ? '...' : 'Status tekshirish'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setView(VIEWS.ADD_FORM)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                + Yangi userbot
              </button>
            </>
          )}
          {view === VIEWS.MONITORING && (
            <button
              className="btn btn-secondary"
              onClick={loadMonitoringStats}
              disabled={monitoringLoading}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {monitoringLoading ? '...' : 'Yangilash'}
            </button>
          )}
          {view === VIEWS.GROUPS && (
            <>
              <button
                className="btn btn-danger"
                onClick={handleCleanupUnavailableGroups}
                disabled={cleaningUnavailableGroups || disconnectedGroups === 0}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {cleaningUnavailableGroups
                  ? 'Tozalanmoqda...'
                  : `Chiqarilganlarni tozalash (${disconnectedGroups})`}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => loadGroups(true)}
                disabled={groupsLoading}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {groupsLoading ? 'Yangilanmoqda...' : 'Telegramdan yangilash'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleOpenJoinGroupForm()}
                disabled={activeUserbots.length === 0}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                + Guruhga qo&apos;shish
              </button>
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* VIEW: ADD USERBOT FORM */}
      {/* ============================================ */}
      {view === VIEWS.ADD_FORM && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3
            style={{
              margin: '0 0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Yangi userbot qo&apos;shish
          </h3>
          <form onSubmit={handleAddUserbot}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label htmlFor="add-phone" style={labelStyle}>Telefon raqam</label>
                <input
                  id="add-phone"
                  type="text"
                  className="form-input"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="+998901234567"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="add-api-id" style={labelStyle}>API ID</label>
                  <input
                    id="add-api-id"
                    type="number"
                    className="form-input"
                    value={addApiId}
                    onChange={(e) => setAddApiId(e.target.value)}
                    placeholder="my.telegram.org dan"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label htmlFor="add-api-hash" style={labelStyle}>API Hash</label>
                  <input
                    id="add-api-hash"
                    type="text"
                    className="form-input"
                    value={addApiHash}
                    onChange={(e) => setAddApiHash(e.target.value)}
                    placeholder="my.telegram.org dan"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setView(VIEWS.USERBOTS);
                  setAddPhone('');
                  setAddApiId('');
                  setAddApiHash('');
                }}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addLoading}
                style={{ flex: 1 }}
              >
                {addLoading ? 'Yuborilmoqda...' : "Qo'shish"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: VERIFY CODE */}
      {/* ============================================ */}
      {view === VIEWS.VERIFY_CODE && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            borderLeft: '4px solid #ffc107',
          }}
        >
          <h3 style={{ margin: '0 0 4px' }}>Telegram kodni kiriting</h3>
          <p
            style={{
              margin: '0 0 16px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            {verifyPhone} raqamiga yuborilgan kodni kiriting
          </p>
          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              className="form-input"
              value={verifyCodeVal}
              onChange={(e) => setVerifyCodeVal(e.target.value)}
              placeholder="12345"
              maxLength={6}
              style={{
                ...inputStyle,
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
              }}
            />
            <div
              style={{ display: 'flex', gap: '10px', marginTop: '16px' }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetVerification}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={verifyLoading || verifyCodeVal.length < 5}
                style={{ flex: 1 }}
              >
                {verifyLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: VERIFY PASSWORD (2FA) */}
      {/* ============================================ */}
      {view === VIEWS.VERIFY_PASSWORD && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            borderLeft: '4px solid #dc3545',
          }}
        >
          <h3 style={{ margin: '0 0 4px' }}>2FA Parol</h3>
          <p
            style={{
              margin: '0 0 16px',
              color: '#666',
              fontSize: '14px',
            }}
          >
            {verifyPhone} uchun ikki bosqichli parolni kiriting
          </p>
          <form onSubmit={handleVerifyPassword}>
            <input
              type="password"
              className="form-input"
              value={verifyPasswordVal}
              onChange={(e) => setVerifyPasswordVal(e.target.value)}
              placeholder="2FA parol"
              style={inputStyle}
            />
            <div
              style={{ display: 'flex', gap: '10px', marginTop: '16px' }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetVerification}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={verifyLoading || !verifyPasswordVal}
                style={{ flex: 1 }}
              >
                {verifyLoading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: USERBOTS LIST */}
      {/* ============================================ */}
      {isUserbotView && (
        <>
          {userbots.length === 0 ? (
            <div
              className="card"
              style={{ textAlign: 'center', padding: '50px 20px' }}
            >
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>
                🤖
              </div>
              <h3 style={{ color: '#555', marginBottom: '8px' }}>
                Hozircha userbotlar yo&apos;q
              </h3>
              <p style={{ color: '#999', marginBottom: '24px' }}>
                Yangi userbot qo&apos;shib, guruhlarni kuzatishni boshlang
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setView(VIEWS.ADD_FORM)}
              >
                + Birinchi userbotni qo&apos;shish
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {userbots.map((ub) => (
                <div
                  key={ub.phone}
                  className="card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {/* Left side - info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{ fontSize: '16px', fontWeight: '700' }}
                      >
                        {ub.phone}
                      </span>
                      {getStatusBadge(ub.status)}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '13px',
                        color: '#777',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>Guruhlar: {ub.total_groups || 0}</span>
                      <span>O&apos;qilgan: {Number(ub.total_messages_read || 0).toLocaleString('uz-UZ')}</span>
                      <span>Yuborilgan: {Number(ub.total_messages_sent || 0).toLocaleString('uz-UZ')}</span>
                      {ub.last_checked && (
                        <span>
                          Tekshirildi: {formatDate(ub.last_checked)}
                        </span>
                      )}
                      {ub.last_message_sent && (
                        <span>
                          Oxirgi xabar:{' '}
                          {formatDate(ub.last_message_sent)}
                        </span>
                      )}
                    </div>

                    {ub.error_message && (
                      <div
                        style={{
                          marginTop: '6px',
                          color: '#dc3545',
                          fontSize: '12px',
                        }}
                      >
                        Xato: {ub.error_message}
                      </div>
                    )}
                  </div>

                  {/* Right side - actions */}
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemove(ub.phone)}
                    style={{
                      padding: '6px 16px',
                      fontSize: '13px',
                    }}
                  >
                    O&apos;chirish
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============================================ */}
      {/* VIEW: ADMIN-MANAGED GROUPS */}
      {/* ============================================ */}
      {view === VIEWS.GROUPS && (
        <div>
          {showJoinGroupForm && (
            <div
              className="card"
              style={{ marginBottom: '16px', borderLeft: '4px solid #007bff' }}
            >
              <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>
                Userbotni Telegram guruhiga qo&apos;shish
              </h3>
              <p style={{ margin: '0 0 14px', color: '#777', fontSize: '13px' }}>
                Avtomatik rejim faol guruhlari eng kam akkauntni tanlaydi.
                Istasangiz aniq active userbotni qo&apos;lda belgilashingiz mumkin.
              </p>
              <form onSubmit={handleJoinGroup}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div>
                    <label htmlFor="join-group-phone" style={labelStyle}>
                      Qaysi userbot
                    </label>
                    <select
                      id="join-group-phone"
                      className="form-input"
                      value={joinGroupPhone}
                      onChange={(event) => setJoinGroupPhone(event.target.value)}
                      style={inputStyle}
                    >
                      <option value="auto">
                        Avtomatik — guruhlari eng kam akkaunt
                      </option>
                      {activeUserbots.map((userbot) => (
                        <option key={userbot.phone} value={userbot.phone}>
                          {userbot.phone} — {activeGroupCounts[userbot.phone] || 0} ta guruh
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="join-group-target" style={labelStyle}>
                      Guruh username yoki linki
                    </label>
                    <input
                      id="join-group-target"
                      className="form-input"
                      type="text"
                      value={joinGroupTarget}
                      onChange={(event) => setJoinGroupTarget(event.target.value)}
                      placeholder="@guruh yoki https://t.me/+..."
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    marginTop: '14px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={joinGroupLoading}
                    onClick={() => {
                      setShowJoinGroupForm(false);
                      setJoinGroupPhone('auto');
                      setJoinGroupTarget('');
                    }}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={joinGroupLoading || !joinGroupTarget.trim()}
                  >
                    {joinGroupLoading
                      ? "Guruhga qo'shilmoqda..."
                      : joinGroupPhone === 'auto'
                        ? "Avtomatik qo'shish"
                        : "Tanlangan userbotni qo'shish"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card" style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '12px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                  Dublikat guruhlar ({duplicateGroups.length})
                </h3>
                <p style={{ margin: 0, color: '#777', fontSize: '12px' }}>
                  Bir guruhga ikki yoki undan ko&apos;p active userbot ulangan holatlar.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={duplicateGroupsLoading}
                onClick={() => loadDuplicateGroups(true)}
                style={{ padding: '7px 14px', fontSize: '12px' }}
              >
                {duplicateGroupsLoading ? 'Tekshirilmoqda...' : 'Dublikatlarni topish'}
              </button>
            </div>

            {duplicateGroupsLoading && duplicateGroups.length === 0 ? (
              <div style={{ color: '#777', fontSize: '13px' }}>Tekshirilmoqda...</div>
            ) : duplicateGroups.length === 0 ? (
              <div style={{ color: '#28a745', fontSize: '13px' }}>
                Dublikat active guruh topilmadi.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {duplicateGroups.map((duplicate) => {
                  const keepPhone =
                    duplicateKeepPhones[duplicate.group_id] ||
                    duplicate.connections?.[0]?.phone ||
                    '';
                  return (
                    <div
                      key={duplicate.group_id}
                      style={{
                        border: '1px solid #f0d58c',
                        background: '#fffaf0',
                        borderRadius: '8px',
                        padding: '10px 12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong>{duplicate.title || `Guruh ${duplicate.group_id}`}</strong>
                        <span style={{ color: '#856404', fontSize: '12px', fontWeight: '600' }}>
                          {duplicate.connection_count} ta userbot
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginTop: '7px',
                          color: '#666',
                          fontSize: '12px',
                        }}
                      >
                        <span>ID: {duplicate.group_id}</span>
                        {duplicate.username && <span>@{duplicate.username}</span>}
                        {(duplicate.connections || []).map((connection) => (
                          <span
                            key={`${duplicate.group_id}:${connection.phone}`}
                            style={{
                              padding: '3px 7px',
                              borderRadius: '12px',
                              background: '#fff3cd',
                              color: '#856404',
                            }}
                          >
                            {connection.phone}
                          </span>
                        ))}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          marginTop: '10px',
                        }}
                      >
                        <label
                          htmlFor={`duplicate-keeper-${duplicate.group_id}`}
                          style={{ color: '#555', fontSize: '12px', fontWeight: '600' }}
                        >
                          Guruhda qoldiriladi:
                        </label>
                        <select
                          id={`duplicate-keeper-${duplicate.group_id}`}
                          value={keepPhone}
                          onChange={(event) =>
                            setDuplicateKeepPhones((previous) => ({
                              ...previous,
                              [duplicate.group_id]: event.target.value,
                            }))
                          }
                          disabled={resolvingDuplicateGroupId === duplicate.group_id}
                          style={{
                            padding: '7px 9px',
                            border: '1px solid #d7bd74',
                            borderRadius: '6px',
                            background: '#fff',
                          }}
                        >
                          {(duplicate.connections || []).map((connection) => (
                            <option key={connection.phone} value={connection.phone}>
                              {connection.phone}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={resolvingDuplicateGroupId === duplicate.group_id}
                          onClick={() => handleResolveDuplicateGroup(duplicate)}
                          style={{ padding: '7px 12px', fontSize: '12px' }}
                        >
                          {resolvingDuplicateGroupId === duplicate.group_id
                            ? 'Olib tashlanmoqda...'
                            : 'Qolgan ulanishlarni olib tashlash'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #17a2b8' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '10px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px' }}>
                  Guruhlarni tasdiqlash navbati
                </h3>
                <p style={{ margin: 0, color: '#777', fontSize: '12px' }}>
                  Ro&apos;yxat avval bazaga saqlanadi. Siz tasdiqlamaguningizcha userbot
                  Telegram guruhiga qo&apos;shilmaydi.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={loadGroupJoinQueue}
                disabled={groupJoinQueueLoading}
                style={{ padding: '7px 14px', fontSize: '12px' }}
              >
                {groupJoinQueueLoading ? 'Yangilanmoqda...' : 'Navbatni yangilash'}
              </button>
            </div>

            <label htmlFor="group-queue-input" style={labelStyle}>
              Har qatorda bitta @username yoki invite-link
            </label>
            <textarea
              id="group-queue-input"
              className="form-input"
              value={groupQueueInput}
              onChange={(event) => setGroupQueueInput(event.target.value)}
              placeholder={'@birinchi_guruh\nhttps://t.me/+privateInvite\nhttps://t.me/uchinchi_guruh'}
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportGroupQueue}
                disabled={groupQueueImporting || !groupQueueInput.trim()}
              >
                {groupQueueImporting ? 'Saqlanmoqda...' : "Ro'yxatni bazaga saqlash"}
              </button>
            </div>

            <div style={{ marginTop: '16px' }}>
              {groupJoinQueueLoading && groupJoinQueue.length === 0 ? (
                <div style={{ color: '#777', fontSize: '13px' }}>Navbat yuklanmoqda...</div>
              ) : groupJoinQueue.length === 0 ? (
                <div style={{ color: '#777', fontSize: '13px' }}>
                  Hozircha tasdiqlash navbati bo&apos;sh.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupJoinQueue.map((item) => {
                    const normalizedStatus = String(item.status || 'pending')
                      .trim()
                      .toLowerCase();
                    const statusStyle = GROUP_QUEUE_STATUS[normalizedStatus] || {
                      label: normalizedStatus || 'Tasdiq kutilmoqda',
                      color: '#555',
                      background: '#eee',
                    };
                    const reviewable = !['processing', 'joined', 'rejected'].includes(
                      normalizedStatus
                    );
                    const telegramUrl = getTelegramGroupUrl(item.target);
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid #e6e6e6',
                          borderRadius: '8px',
                          padding: '11px 12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <strong style={{ wordBreak: 'break-word' }}>{item.target}</strong>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              flexWrap: 'wrap',
                            }}
                          >
                            {telegramUrl && (
                              <a
                                href={telegramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  textDecoration: 'none',
                                }}
                              >
                                Telegramda ochish
                              </a>
                            )}
                            <span
                              style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: statusStyle.color,
                                background: statusStyle.background,
                              }}
                            >
                              {statusStyle.label}
                            </span>
                          </div>
                        </div>

                        {item.error && (
                          <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '6px' }}>
                            Xato: {item.error}
                          </div>
                        )}
                        {item.joined_phone && (
                          <div style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>
                            {item.joined_phone} — {item.joined_group_title || item.joined_group_id}
                          </div>
                        )}

                        {reviewable && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                              marginTop: '10px',
                            }}
                          >
                            <select
                              className="form-input"
                              value={groupQueuePhones[item.id] || 'auto'}
                              onChange={(event) =>
                                setGroupQueuePhones((previous) => ({
                                  ...previous,
                                  [item.id]: event.target.value,
                                }))
                              }
                              disabled={groupQueueActionId === item.id}
                              style={{ ...inputStyle, width: 'auto', minWidth: '230px' }}
                            >
                              <option value="auto">Avtomatik — guruhlari eng kam</option>
                              {activeUserbots.map((userbot) => (
                                <option key={userbot.phone} value={userbot.phone}>
                                  {userbot.phone} — {activeGroupCounts[userbot.phone] || 0} ta guruh
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={groupQueueActionId === item.id}
                              onClick={() => handleRejectGroupQueue(item)}
                              style={{ padding: '7px 11px', fontSize: '12px' }}
                            >
                              Rad etish
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={groupQueueActionId === item.id}
                              onClick={() => handleApproveGroupQueue(item)}
                              style={{ padding: '7px 11px', fontSize: '12px' }}
                            >
                              {groupQueueActionId === item.id
                                ? "Qo'shilmoqda..."
                                : "Tasdiqlash va qo'shish"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <StatCard
              title="Ulangan guruhlar"
              value={connectedGroups.length}
              icon="👥"
              color="#007bff"
            />
            <StatCard title="O'qiladigan" value={readableGroups} icon="📥" color="#28a745" />
            <StatCard
              title="Xabar yuboriladigan"
              value={sendableGroups}
              icon="📤"
              color="#6f42c1"
            />
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px' }}>Guruh ruxsatlari</h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSelectAllGroups}
                disabled={selectingAllGroups || groups.length === 0}
                style={{ padding: '7px 14px', fontSize: '12px' }}
              >
                {selectingAllGroups ? 'Belgilanmoqda...' : '✓ Barchasini belgilash'}
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div>
                <label htmlFor="group-search" style={labelStyle}>
                  Guruh qidirish
                </label>
                <input
                  id="group-search"
                  className="form-input"
                  type="search"
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  placeholder="Nomi, username, ID yoki telefon"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="group-phone-filter" style={labelStyle}>
                  Userbot
                </label>
                <select
                  id="group-phone-filter"
                  className="form-input"
                  value={groupPhoneFilter}
                  onChange={(event) => setGroupPhoneFilter(event.target.value)}
                  style={inputStyle}
                >
                  <option value="all">Barcha userbotlar</option>
                  {userbotPhones.map((phone) => (
                    <option key={phone} value={phone}>
                      {phone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                ['all', `Barchasi (${groups.length})`],
                ['read', `O'qiladigan (${readableGroups})`],
                ['send', `Xabar yuboriladigan (${sendableGroups})`],
                ['inactive', `Ulanmagan (${disconnectedGroups})`],
                [
                  'disabled',
                  `Ikkalasi o'chirilgan (${
                    connectedGroups.filter((group) => !group.can_read && !group.can_send).length
                  })`,
                ],
              ].map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setGroupPermissionFilter(filter)}
                  style={{
                    ...groupFilterBtnStyle,
                    ...(groupPermissionFilter === filter ? groupFilterBtnActiveStyle : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {groupsLoading && groups.length === 0 ? (
            <div className="loading" style={{ padding: '40px' }}>
              Telegram guruhlari yuklanmoqda...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>👥</div>
              <h3 style={{ margin: '0 0 6px' }}>Guruh topilmadi</h3>
              <p style={{ margin: 0, color: '#777', fontSize: '14px' }}>
                Filtrlarni tozalang yoki Telegramdan guruhlarni qayta yangilang.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredGroups.map((group) => {
                const readKey = `${group.phone}:${group.group_id}:can_read`;
                const sendKey = `${group.phone}:${group.group_id}:can_send`;
                const isUpdatingGroup =
                  updatingGroupKey === readKey || updatingGroupKey === sendKey;
                return (
                  <div
                    key={`${group.phone}:${group.group_id}`}
                    className="card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 18px',
                      opacity: group.is_available ? 1 : 0.7,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '5px',
                        }}
                      >
                        <strong style={{ color: '#222' }}>
                          {group.title || `Guruh ${group.group_id}`}
                        </strong>
                        {!group.is_available && (
                          <span style={unavailableBadgeStyle}>Hozir ulanmagan</span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          color: '#777',
                          fontSize: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>{group.phone}</span>
                        <span>ID: {group.group_id}</span>
                        {group.username && (
                          <a
                            href={`https://t.me/${group.username}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#007bff' }}
                          >
                            @{group.username}
                          </a>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '7px',
                          flexWrap: 'wrap',
                          marginTop: '10px',
                        }}
                      >
                        <GroupOrderStat
                          label="Jami yuk"
                          value={group.orders_total}
                          color="#0056b3"
                          background="#e7f1ff"
                        />
                        <GroupOrderStat
                          label="Yuk egasi"
                          value={group.orders_cargo_owner}
                          color="#087f5b"
                          background="#e6fcf5"
                        />
                        <GroupOrderStat
                          label="Logist"
                          value={group.orders_logist}
                          color="#9c36b5"
                          background="#f8f0fc"
                        />
                        <GroupOrderStat
                          label="Noma'lum"
                          value={group.orders_unknown}
                          color="#666"
                          background="#f1f3f5"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                      }}
                    >
                      <GroupPermissionToggle
                        label="Xabarlarni o'qish"
                        checked={group.can_read}
                        color="#28a745"
                        disabled={isUpdatingGroup}
                        onChange={(value) => handleGroupPermissionChange(group, 'can_read', value)}
                      />
                      <GroupPermissionToggle
                        label="Xabar yuborish"
                        checked={group.can_send}
                        color="#6f42c1"
                        disabled={isUpdatingGroup}
                        onChange={(value) => handleGroupPermissionChange(group, 'can_send', value)}
                      />
                      {group.is_available ? (
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={
                            leavingGroupKey === `${group.phone}:${group.group_id}` ||
                            isUpdatingGroup
                          }
                          onClick={() => handleLeaveGroup(group)}
                          style={{ padding: '8px 12px', fontSize: '12px' }}
                        >
                          {leavingGroupKey === `${group.phone}:${group.group_id}`
                            ? 'Chiqarilmoqda...'
                            : 'Guruhdan chiqarish'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={
                            !activeUserbots.some((userbot) => userbot.phone === group.phone)
                          }
                          onClick={() =>
                            handleOpenJoinGroupForm(
                              group.username ? `@${group.username}` : ''
                            )
                          }
                          style={{ padding: '8px 12px', fontSize: '12px' }}
                        >
                          Avtomatik qayta qo&apos;shish
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW: MONITORING STATS */}
      {/* ============================================ */}
      {view === VIEWS.MONITORING && (
        <div>
          {monitoringLoading && !monitoringStats ? (
            <div className="loading" style={{ padding: '40px' }}>
              Monitoring yuklanmoqda...
            </div>
          ) : monitoringStats ? (
            <>
              {/* Service Health Card */}
              {healthData && (
                <div
                  className="card"
                  style={{
                    marginBottom: '16px',
                    borderLeft: `4px solid ${healthData.status === 'healthy' ? '#28a745' : '#dc3545'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '16px' }}>
                      Userbot Service
                    </h3>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor:
                          healthData.status === 'healthy'
                            ? '#d4edda'
                            : '#f8d7da',
                        color:
                          healthData.status === 'healthy'
                            ? '#155724'
                            : '#721c24',
                      }}
                    >
                      {healthData.status === 'healthy'
                        ? 'Ishlayapti'
                        : 'Muammo'}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      flexWrap: 'wrap',
                      fontSize: '14px',
                    }}
                  >
                    <StatItem
                      label="Aktiv clientlar"
                      value={healthData.active_clients || 0}
                    />
                    <StatItem
                      label="Kutilayotgan"
                      value={healthData.pending_clients || 0}
                    />
                    {healthData.group_monitoring && (
                      <>
                        <StatItem
                          label="Aktiv listenerlar"
                          value={
                            healthData.group_monitoring
                              .active_listeners || 0
                          }
                        />
                        <StatItem
                          label="Processor"
                          value={
                            healthData.group_monitoring
                              .is_processor_running
                              ? 'Ishlayapti'
                              : "To'xtagan"
                          }
                          valueColor={
                            healthData.group_monitoring
                              .is_processor_running
                              ? '#28a745'
                              : '#dc3545'
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Processing Stats Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <StatCard
                  title="Jami o'qilgan"
                  value={monitoringStats.total_processed || 0}
                  icon="📨"
                  color="#007bff"
                />
                <StatCard
                  title="Bazaga qo'shilgan"
                  value={monitoringStats.total_inserted || 0}
                  icon="✅"
                  color="#28a745"
                />
                <StatCard
                  title="Dublikatlar"
                  value={monitoringStats.total_duplicates || 0}
                  icon="🔁"
                  color="#ffc107"
                />
                <StatCard
                  title="Parse xatolik"
                  value={monitoringStats.total_parse_errors || 0}
                  icon="❌"
                  color="#dc3545"
                />
              </div>

              {/* File Status Card */}
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
                  Fayl holati (group_orders.jsonl)
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '14px',
                  }}
                >
                  <StatItem
                    label="Fayl mavjud"
                    value={monitoringStats.file_exists ? 'Ha' : "Yo'q"}
                    valueColor={
                      monitoringStats.file_exists ? '#28a745' : '#999'
                    }
                  />
                  <StatItem
                    label="Fayl hajmi"
                    value={formatFileSize(
                      monitoringStats.file_size_bytes || 0
                    )}
                  />
                  <StatItem label="Hajm limiti" value="10 MB" />
                  {monitoringStats.file_exists && (
                    <StatItem
                      label="Foiz to'lgan"
                      value={`${(
                        (monitoringStats.file_size_bytes /
                          (10 * 1024 * 1024)) *
                        100
                      ).toFixed(1)}%`}
                      valueColor={
                        monitoringStats.file_size_bytes >
                        8 * 1024 * 1024
                          ? '#dc3545'
                          : monitoringStats.file_size_bytes >
                              5 * 1024 * 1024
                            ? '#ffc107'
                            : '#28a745'
                      }
                    />
                  )}
                </div>

                {/* File size progress bar */}
                {monitoringStats.file_exists && (
                  <div
                    style={{
                      marginTop: '12px',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '4px',
                        width: `${Math.min(
                          (monitoringStats.file_size_bytes /
                            (10 * 1024 * 1024)) *
                            100,
                          100
                        )}%`,
                        backgroundColor:
                          monitoringStats.file_size_bytes >
                          8 * 1024 * 1024
                            ? '#dc3545'
                            : monitoringStats.file_size_bytes >
                                5 * 1024 * 1024
                              ? '#ffc107'
                              : '#28a745',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Processor Details */}
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
                  Processor holati
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '14px',
                  }}
                >
                  <StatItem
                    label="Holati"
                    value={
                      monitoringStats.is_running
                        ? 'Ishlayapti'
                        : "To'xtagan"
                    }
                    valueColor={
                      monitoringStats.is_running ? '#28a745' : '#dc3545'
                    }
                  />
                  <StatItem
                    label="Aktiv listenerlar"
                    value={monitoringStats.active_listeners || 0}
                  />
                  <StatItem
                    label="Oxirgi qayta ishlash"
                    value={
                      monitoringStats.last_processed_at
                        ? formatDate(monitoringStats.last_processed_at)
                        : '-'
                    }
                  />
                </div>
              </div>

              {/* Banned Groups */}
              <div className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px' }}>
                    Bloklangan guruhlar ({bannedGroups.length})
                  </h3>
                  {bannedGroups.length > 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleClearBannedGroups()}
                      disabled={clearingBanned}
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                      {clearingBanned ? '...' : 'Barchasini tozalash'}
                    </button>
                  )}
                </div>

                {bannedGroups.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                    Bloklangan guruhlar yo&apos;q. Broadcast da xatolik
                    bo&apos;lgan guruhlar avtomatik shu yerga qo&apos;shiladi
                    va keyingi broadcast da o&apos;tkazib yuboriladi.
                  </p>
                ) : (
                  <>
                    {/* Guruhlarni userbot bo'yicha guruhlash */}
                    {Object.entries(
                      bannedGroups.reduce((acc, g) => {
                        if (!acc[g.phone]) acc[g.phone] = [];
                        acc[g.phone].push(g);
                        return acc;
                      }, {})
                    ).map(([phone, groups]) => (
                      <div key={phone} style={{ marginBottom: '12px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: '600',
                              fontSize: '13px',
                            }}
                          >
                            {phone} ({groups.length} guruh)
                          </span>
                          <button
                            onClick={() => handleClearBannedGroups(phone)}
                            disabled={clearingBanned}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#007bff',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Tozalash
                          </button>
                        </div>
                        {groups.map((g, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '6px 10px',
                              marginBottom: '4px',
                              backgroundColor: '#fff0f0',
                              borderRadius: '4px',
                              fontSize: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span style={{ color: '#dc3545' }}>
                              {g.group_name || `ID: ${g.group_id}`}
                            </span>
                            {g.banned_at && (
                              <span style={{ color: '#999' }}>
                                {formatDate(g.banned_at)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : (
            <div
              className="card"
              style={{ textAlign: 'center', padding: '40px' }}
            >
              <p style={{ color: '#666' }}>
                Monitoring ma&apos;lumotlari yuklanmadi
              </p>
              <button
                className="btn btn-primary"
                onClick={loadMonitoringStats}
                style={{ marginTop: '12px' }}
              >
                Qayta yuklash
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({ title, value, icon, color }) {
  return (
    <div
      className="card"
      style={{
        padding: '16px',
        textAlign: 'center',
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>
        {title}
      </div>
    </div>
  );
}

function StatItem({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontWeight: '600', color: valueColor || '#333' }}>
        {value}
      </div>
    </div>
  );
}

function GroupPermissionToggle({ label, checked, color, disabled, onChange }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        border: `1px solid ${checked ? color : '#ddd'}`,
        borderRadius: '8px',
        backgroundColor: checked ? `${color}12` : '#f8f9fa',
        color: checked ? color : '#777',
        fontSize: '12px',
        fontWeight: '600',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        style={{ accentColor: color, width: '16px', height: '16px' }}
      />
      {disabled ? 'Saqlanmoqda...' : label}
    </label>
  );
}

function GroupOrderStat({ label, value, color, background }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 8px',
        borderRadius: '7px',
        backgroundColor: background,
        color,
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
      }}
    >
      {label}:
      <strong style={{ fontSize: '12px' }}>
        {Number(value || 0).toLocaleString('uz-UZ')}
      </strong>
    </span>
  );
}

// ============================================
// STYLES
// ============================================

const tabBtnStyle = {
  padding: '8px 16px',
  borderRadius: '20px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  color: '#555',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const tabBtnActiveStyle = {
  backgroundColor: '#007bff',
  color: '#fff',
  borderColor: '#007bff',
};

const groupFilterBtnStyle = {
  padding: '6px 12px',
  borderRadius: '16px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: '12px',
  cursor: 'pointer',
};

const groupFilterBtnActiveStyle = {
  backgroundColor: '#e7f1ff',
  color: '#0056b3',
  borderColor: '#80bdff',
  fontWeight: '600',
};

const unavailableBadgeStyle = {
  padding: '2px 7px',
  borderRadius: '10px',
  backgroundColor: '#e2e3e5',
  color: '#555',
  fontSize: '10px',
  fontWeight: '600',
};

const labelStyle = {
  display: 'block',
  marginBottom: '4px',
  fontWeight: '600',
  fontSize: '13px',
  color: '#444',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
};

const toastSuccessStyle = {
  position: 'fixed',
  top: '80px',
  right: '20px',
  padding: '12px 20px',
  backgroundColor: '#d4edda',
  color: '#155724',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 9999,
  fontSize: '14px',
  fontWeight: '500',
};

const toastErrorStyle = {
  position: 'fixed',
  top: '80px',
  right: '20px',
  padding: '12px 20px',
  backgroundColor: '#f8d7da',
  color: '#721c24',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 9999,
  fontSize: '14px',
  fontWeight: '500',
  maxWidth: '350px',
};
