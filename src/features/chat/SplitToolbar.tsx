/**
 * SplitToolbar — Global toolbar shown above the split-pane area.
 *
 * Provides: sidebar toggle, new session, exit split mode.
 */

import { useTranslation } from 'react-i18next'
import { SidebarIcon, NewChatIcon, CloseIcon } from '../../components/Icons'
import { IconButton } from '../../components/ui'

interface SplitToolbarProps {
  onNewSession: () => void
  onExitSplit: () => void
  onOpenSidebar: () => void
  showSidebarButton: boolean
}

export function SplitToolbar({ onNewSession, onExitSplit, onOpenSidebar, showSidebarButton }: SplitToolbarProps) {
  const { t } = useTranslation('chat')

  return (
    <div className="h-8 flex items-center justify-between px-2 shrink-0 bg-bg-100">
      {/* Left */}
      <div className="flex items-center gap-0.5">
        {showSidebarButton && (
          <IconButton
            size="sm"
            aria-label={t('header.openSidebar')}
            onClick={onOpenSidebar}
            className="text-text-400 hover:text-text-100 hover:bg-bg-200/50"
          >
            <SidebarIcon size={14} />
          </IconButton>
        )}

        <IconButton
          size="sm"
          aria-label={t('header.newChat')}
          onClick={onNewSession}
          className="text-text-400 hover:text-text-100 hover:bg-bg-200/50"
        >
          <NewChatIcon size={14} />
        </IconButton>
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5">
        <IconButton
          size="sm"
          aria-label="Exit split"
          onClick={onExitSplit}
          className="text-text-400 hover:text-text-100 hover:bg-bg-200/50"
        >
          <CloseIcon size={14} />
        </IconButton>
      </div>
    </div>
  )
}
