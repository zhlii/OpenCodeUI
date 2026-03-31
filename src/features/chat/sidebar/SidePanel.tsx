import { useCallback, useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SessionList } from '../../sessions'
import { ActiveSessionItem } from './ActiveSessionItem'
import { NotificationItem } from './NotificationItem'
import { SidebarFooter } from './SidebarFooter'
import {
  SidebarIcon,
  PlusIcon,
  SearchIcon,
} from '../../../components/Icons'
import { useDirectory, useSessionStats, useKeybindingLabel } from '../../../hooks'
import { useSessionContext } from '../../../contexts/useSessionContext'
import { useMessageStore, childSessionStore } from '../../../store'
import { useBusySessions, useBusyCount } from '../../../store/activeSessionStore'
import { notificationStore, useNotifications, useUnreadNotificationCount } from '../../../store/notificationStore'
import type { NotificationEntry } from '../../../store/notificationStore'
import {
  updateSession,
  getSession,
  subscribeToConnectionState,
  type ApiSession,
  type ConnectionInfo,
} from '../../../api'
import { uiErrorHandler } from '../../../utils'

// 侧边栏设计模式：
// - 按钮结构统一，不因 expanded/collapsed 改变 DOM
// - 按钮内容使用 -translate-x-2 让图标在收起时居中
// - 文字用 opacity 过渡，不改变布局
// - 收起宽度 49px，展开宽度 288px

interface SidePanelProps {
  onNewSession: () => void
  onSelectSession: (session: ApiSession) => void
  onCloseMobile?: () => void
  selectedSessionId: string | null
  isMobile?: boolean
  isExpanded?: boolean
  onToggleSidebar: () => void
  contextLimit?: number
  onOpenSettings?: () => void
}

export function SidePanel({
  onNewSession,
  onSelectSession,
  onCloseMobile,
  selectedSessionId,
  isMobile = false,
  isExpanded = true,
  onToggleSidebar,
  contextLimit = 200000,
  onOpenSettings,
}: SidePanelProps) {
  const { t } = useTranslation(['chat', 'common'])
  const { currentDirectory, addDirectory } = useDirectory()
  const [connectionState, setConnectionState] = useState<ConnectionInfo | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'recents' | 'active'>('recents')

  const showLabels = isExpanded || isMobile
  const newChatShortcut = useKeybindingLabel('newSession')

  // Session stats
  const { messages } = useMessageStore()
  const stats = useSessionStats(contextLimit)
  const hasMessages = messages.length > 0

  // Active sessions
  const busySessions = useBusySessions()
  const busyCount = useBusyCount()
  // Notification history
  const notifications = useNotifications()
  const unreadNotificationCount = useUnreadNotificationCount()
  const attentionCount = busyCount + unreadNotificationCount

  useEffect(() => {
    return subscribeToConnectionState(setConnectionState)
  }, [])

  const { sessions, isLoading, isLoadingMore, hasMore, search, setSearch, loadMore, deleteSession, refresh } =
    useSessionContext()

  // 缓存通过 API 拉取的 session 数据（sessions 列表中不存在的）
  const [fetchedSessions, setFetchedSessions] = useState<Record<string, ApiSession>>({})

  // 为 active sessions 构建 sessionId -> ApiSession 的查找表
  const sessionLookup = useMemo(() => {
    const map = new Map<string, ApiSession>()
    for (const s of sessions) {
      map.set(s.id, s)
    }
    // fetchedSessions 作为补充（其他项目的 session）
    for (const [id, s] of Object.entries(fetchedSessions)) {
      if (!map.has(id)) {
        map.set(id, s)
      }
    }
    return map
  }, [sessions, fetchedSessions])

  // 异步拉取不在 lookup 中的 active/notification/selected session
  useEffect(() => {
    const allNeeded = [
      ...busySessions.map(e => ({ sessionId: e.sessionId, directory: e.directory })),
      ...notifications.map(e => ({ sessionId: e.sessionId, directory: e.directory })),
    ]
    if (selectedSessionId && !sessionLookup.has(selectedSessionId)) {
      allNeeded.push({ sessionId: selectedSessionId, directory: currentDirectory || '' })
    }
    const missing = allNeeded.filter(entry => !sessionLookup.has(entry.sessionId))
    if (missing.length === 0) return

    let cancelled = false
    const fetchMissing = async () => {
      const results: Record<string, ApiSession> = {}
      await Promise.allSettled(
        missing.map(async entry => {
          try {
            const session = await getSession(entry.sessionId, entry.directory)
            if (!cancelled) results[session.id] = session
          } catch {
            /* ignore */
          }
        }),
      )
      if (!cancelled && Object.keys(results).length > 0) {
        setFetchedSessions(prev => ({ ...prev, ...results }))
      }
    }
    fetchMissing()
    return () => {
      cancelled = true
    }
  }, [busySessions, notifications, sessionLookup, selectedSessionId, currentDirectory])

  // ---- 子 session 展示数据 ----
  const rootSessionIds = useMemo(() => new Set(sessions.map(s => s.id)), [sessions])

  const findParentId = useCallback(
    (id: string) => {
      const s = sessionLookup.get(id)
      if (s?.parentID) return s.parentID
      return childSessionStore.getSessionInfo(id)?.parentID
    },
    [sessionLookup],
  )

  // 开关开 → 拉 /children 全量：选中的 root 或选中子 session 时保持其父展开
  const expandedChildSessionIds = useMemo(() => {
    if (search || !sidebarShowChildSessions || !selectedSessionId) return undefined
    if (rootSessionIds.has(selectedSessionId)) return new Set([selectedSessionId])
    const pid = findParentId(selectedSessionId)
    if (pid && rootSessionIds.has(pid)) return new Set([pid])
    return undefined
  }, [search, sidebarShowChildSessions, selectedSessionId, rootSessionIds, findParentId])

  // 开关关 → 只挂活跃的 + 选中的子 session
  const inlineChildSessions = useMemo(() => {
    if (search) return undefined
    const map = new Map<string, ApiSession[]>()
    const add = (parentId: string, session: ApiSession) => {
      if (expandedChildSessionIds?.has(parentId)) return
      let arr = map.get(parentId)
      if (!arr) {
        arr = []
        map.set(parentId, arr)
      }
      if (!arr.some(s => s.id === session.id)) arr.push(session)
    }
    for (const entry of busySessions) {
      const pid = findParentId(entry.sessionId)
      if (pid && rootSessionIds.has(pid)) {
        const s = sessionLookup.get(entry.sessionId)
        if (s) add(pid, s)
      }
    }
    if (!sidebarShowChildSessions && selectedSessionId && !rootSessionIds.has(selectedSessionId)) {
      const pid = findParentId(selectedSessionId)
      if (pid && rootSessionIds.has(pid)) {
        const s = sessionLookup.get(selectedSessionId)
        if (s) add(pid, s)
      }
    }
    return map.size > 0 ? map : undefined
  }, [
    search,
    busySessions,
    selectedSessionId,
    sidebarShowChildSessions,
    rootSessionIds,
    expandedChildSessionIds,
    sessionLookup,
    findParentId,
  ])

  const handleSelect = useCallback(
    (session: ApiSession) => {
      // Global 模式下，点击 session 自动切换到该 session 的工作目录并添加到项目列表
      if (!currentDirectory && session.directory) {
        addDirectory(session.directory)
      }
      onSelectSession(session)
      if (window.innerWidth < 768 && onCloseMobile) {
        onCloseMobile()
      }
    },
    [currentDirectory, addDirectory, onSelectSession, onCloseMobile],
  )

  // Active tab 专用：跨目录的 session 需要确保目录在项目列表中
  const handleSelectActive = useCallback(
    (session: ApiSession) => {
      if (session.directory) {
        addDirectory(session.directory)
      }
      onSelectSession(session)
      if (window.innerWidth < 768 && onCloseMobile) {
        onCloseMobile()
      }
    },
    [addDirectory, onSelectSession, onCloseMobile],
  )

  const handleRename = useCallback(
    async (sessionId: string, newTitle: string) => {
      try {
        await updateSession(sessionId, { title: newTitle }, currentDirectory)
        refresh()
      } catch (e) {
        uiErrorHandler('rename session', e)
      }
    },
    [currentDirectory, refresh],
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId)

      if (selectedSessionId === sessionId) {
        onNewSession()
      }
    },
    [deleteSession, onNewSession, selectedSessionId],
  )

  // 统一的结构，通过 CSS 控制显示/隐藏
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ===== Header ===== */}
      <div className="h-14 shrink-0 flex items-center">
        {/* Logo 区域 - 展开时显示 */}
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{
            width: showLabels ? 'auto' : 0,
            paddingLeft: showLabels ? 16 : 0,
            opacity: showLabels ? 1 : 0,
          }}
        >
          <a href="/" className="flex items-center whitespace-nowrap">
            <span className="text-base font-semibold text-text-100 tracking-tight">{t('header.openCode')}</span>
          </a>
        </div>

        {/* Toggle Button - 桌面端和移动端都显示 */}
        <div
          className="flex-1 flex items-center transition-all duration-300 ease-out"
          style={{ justifyContent: showLabels ? 'flex-end' : 'center', paddingRight: showLabels ? 8 : 0 }}
        >
          <button
            onClick={onToggleSidebar}
            aria-label={isExpanded ? t('sidebar.collapseSidebar') : t('sidebar.expandSidebar')}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-400 hover:text-text-100 hover:bg-bg-200 active:scale-[0.98] transition-all duration-200"
          >
            <SidebarIcon size={18} />
          </button>
        </div>
      </div>

      {/* ===== Navigation - 图标位置固定 ===== */}
      <div className="flex flex-col gap-0.5 mx-2">
        {/* New Chat - 图标始终在 padding-left: 6px 位置，收起时刚好居中 */}
        <button
          onClick={onNewSession}
          className="h-8 flex items-center rounded-lg text-text-300 hover:text-text-100 hover:bg-bg-200 active:scale-[0.98] transition-all duration-300 group overflow-hidden"
          style={{
            width: showLabels ? '100%' : 32,
            paddingLeft: 6,
            paddingRight: 6,
          }}
          title={t('sidebar.newChat')}
        >
          <span className="size-5 flex items-center justify-center shrink-0">
            <PlusIcon size={16} />
          </span>
          <span
            className="ml-2 text-sm whitespace-nowrap transition-opacity duration-300"
            style={{ opacity: showLabels ? 1 : 0 }}
          >
            {t('sidebar.newChat')}
          </span>
          <span
            className="ml-auto text-[10px] text-text-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            style={{ opacity: showLabels ? undefined : 0 }}
          >
            {newChatShortcut}
          </span>
        </button>
      </div >

      {/* ===== Main Content ===== */}
      < div
        className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-out"
        style={{
          opacity: showLabels ? 1 : 0,
          visibility: showLabels ? 'visible' : 'hidden',
        }
        }
      >
        {/* Search */}
        < div className="px-3 py-2 mt-2" >
          <div className="relative group">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400 w-3.5 h-3.5 group-focus-within:text-accent-main-100 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('sidebar.searchChats')}
              className="w-full bg-bg-200/40 hover:bg-bg-200/60 focus:bg-bg-000 border border-transparent focus:border-border-200 rounded-lg py-1.5 pl-8 pr-8 text-xs text-text-100 placeholder:text-text-400/70 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-400 hover:text-text-100 text-sm"
                aria-label={t('sidebar.clearSearch')}
              >
                ×
              </button>
            )}
          </div>
        </div >

        {/* Tab Bar: Recents / Active */}
        < div className="flex-1 flex flex-col min-h-0 overflow-hidden" >
          <div className="flex items-center px-3 gap-1 shrink-0">
            <button
              onClick={() => setSidebarTab('recents')}
              className={`px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150 ${sidebarTab === 'recents' ? 'text-text-100' : 'text-text-500 hover:text-text-300'
                }`}
            >
              {t('sidebar.recents')}
            </button>
            <button
              onClick={() => setSidebarTab('active')}
              className={`px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150 flex items-center gap-1.5 ${sidebarTab === 'active' ? 'text-text-100' : 'text-text-500 hover:text-text-300'
                }`}
            >
              {t('sidebar.active')}
              {attentionCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full ${attentionCount > busyCount
                    ? 'bg-accent-main-100/15 text-accent-main-100'
                    : 'bg-success-100/15 text-success-100'
                    }`}
                >
                  {attentionCount}
                </span>
              )}
            </button>
          </div>

          {/* Recents Tab */}
          {
            sidebarTab === 'recents' && (
              <div className="flex-1 overflow-hidden">
                <SessionList
                  sessions={sessions}
                  selectedId={selectedSessionId}
                  isLoading={isLoading}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMore}
                  search={search}
                  onSearchChange={setSearch}
                  onSelect={handleSelect}
                  onDelete={handleDeleteSession}
                  onRename={handleRename}
                  onLoadMore={loadMore}
                  onNewChat={onNewSession}
                  showHeader={false}
                  grouped={false}
                  density="compact"
                  showStats
                />
              </div >
            )
          }

          {/* Active Sessions Tab */}
          {
            sidebarTab === 'active' && (
              <div className="flex-1 overflow-hidden mt-1">
                {busySessions.length === 0 && notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-text-400 opacity-60">
                    <p className="text-xs">{t('sidebar.noActiveSessions')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto custom-scrollbar px-2">
                    {/* Busy sessions */}
                    {busySessions.map(entry => {
                      const resolvedSession = sessionLookup.get(entry.sessionId)
                      return (
                        <ActiveSessionItem
                          key={entry.sessionId}
                          entry={entry}
                          resolvedSession={resolvedSession}
                          isSelected={entry.sessionId === selectedSessionId}
                          onSelect={handleSelectActive}
                        />
                      )
                    })}

                    {/* Divider + actions between busy and notifications */}
                    {notifications.length > 0 && (
                      <div
                        className={`flex items-center justify-between gap-2 ${busySessions.length > 0 ? 'mt-2 pt-2 border-t border-border-200/30' : ''}`}
                      >
                        <span className="text-[10px] font-medium text-text-400 uppercase tracking-wider pl-1">
                          {t('sidebar.notifications')}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {notifications.some((n: NotificationEntry) => !n.read) && (
                            <button
                              className="text-[10px] text-text-400 hover:text-text-200 px-1.5 py-0.5 rounded-md hover:bg-bg-200 transition-all duration-150 active:scale-95"
                              onClick={() => notificationStore.markAllRead()}
                            >
                              {t('sidebar.readAll')}
                            </button>
                          )}
                          <button
                            className="text-[10px] text-text-400 hover:text-text-200 px-1.5 py-0.5 rounded-md hover:bg-bg-200 transition-all duration-150 active:scale-95"
                            onClick={() => notificationStore.clearAll()}
                          >
                            {t('common:clear')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Notification history */}
                    {notifications.map((entry: NotificationEntry) => {
                      const resolvedSession = sessionLookup.get(entry.sessionId)
                      return (
                        <NotificationItem
                          key={entry.id}
                          entry={entry}
                          resolvedSession={resolvedSession}
                          onSelect={handleSelectActive}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
        </div >
      </div >

      {/* Spacer for collapsed */}
      {!showLabels && <div className="flex-1" />}

      {/* ===== Footer ===== */}
      <SidebarFooter
        showLabels={showLabels}
        connectionState={connectionState?.state || 'disconnected'}
        stats={stats}
        hasMessages={hasMessages}
        onOpenSettings={onOpenSettings}
      />
    </div >
  )
}
