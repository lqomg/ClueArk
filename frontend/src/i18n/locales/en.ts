export type WebTranslationKey =
  | 'app.tagline'
  | 'nav.home'
  | 'nav.monitors'
  | 'nav.manage'
  | 'nav.sources'
  | 'nav.notifications'
  | 'nav.profile'
  | 'nav.logout'
  | 'auth.login'
  | 'auth.register'
  | 'auth.passwordMode'
  | 'auth.otpMode'
  | 'auth.account'
  | 'auth.password'
  | 'auth.email'
  | 'auth.sendCode'
  | 'auth.noAccount'
  | 'auth.registerSubtitle'
  | 'auth.forgotPassword'
  | 'auth.forgotSubtitle'
  | 'auth.codeLabel'
  | 'auth.passwordMin'
  | 'auth.confirmPassword'
  | 'auth.passwordPlaceholder'
  | 'auth.confirmPlaceholder'
  | 'auth.acceptTerms'
  | 'auth.termsOfService'
  | 'auth.privacyPolicy'
  | 'auth.conjunctionAnd'
  | 'auth.acceptTermsRequired'
  | 'auth.requestCodeFirst'
  | 'auth.resendCode'
  | 'auth.resendInSeconds'
  | 'auth.codeSentRegister'
  | 'auth.registerSubmit'
  | 'auth.hasAccount'
  | 'auth.sendFailed'
  | 'auth.registerFailed'
  | 'auth.resetCodeSent'
  | 'auth.resetSuccess'
  | 'auth.resetFailed'
  | 'auth.newPassword'
  | 'auth.resetPassword'
  | 'auth.backToLogin'
  | 'profile.title'
  | 'profile.subtitle'
  | 'profile.username'
  | 'profile.email'
  | 'profile.timezone'
  | 'profile.language'
  | 'profile.save'
  | 'profile.saving'
  | 'profile.saved'
  | 'common.cancel'
  | 'common.loading'
  | 'common.all'
  | 'common.loadFailed'
  | 'common.user'
  | 'common.delete'
  | 'common.deleting'
  | 'common.filtered'
  | 'common.manage'
  | 'common.refreshing'
  | 'common.submitting'
  | 'common.sending'
  | 'common.required'
  | 'feed.translate'
  | 'feed.showOriginal'
  | 'feed.translating'
  | 'notifications.title'
  | 'notifications.empty'
  | 'notifications.markAllRead'
  | 'notifications.detail'
  | 'notifications.openTimeline'
  | 'notifications.openSource'
  | 'notifications.markRead'
  | 'notifications.read'
  | 'notifications.recommendReason'
  | 'notifications.viewOriginal'
  | 'notifications.unread'
  | 'notifications.operationFailed'
  | 'notifications.markReadFailed'
  | 'notifications.unnamedMonitor'
  | 'notifications.reasonPending'
  | 'home.welcome'
  | 'home.subtitle'
  | 'home.feed'
  | 'home.alerts'
  | 'home.searchPlaceholder'
  | 'home.intel'
  | 'home.importance'
  | 'home.viewOriginal'
  | 'home.greeting'
  | 'home.welcomeDesc'
  | 'home.filterByTopic'
  | 'home.allMonitors'
  | 'home.searchExtended'
  | 'home.loadFeedFailed'
  | 'home.noMonitors'
  | 'home.noMonitorsDesc'
  | 'home.metricTopics'
  | 'home.metricTopicsHint'
  | 'home.metricTodayCount'
  | 'home.metricTodayHint'
  | 'home.metricReadyRate'
  | 'home.metricReadyHint'
  | 'home.alertsUrgent'
  | 'home.noAlerts'
  | 'home.loadingFeed'
  | 'home.feedEmpty'
  | 'home.feedAiHint'
  | 'home.viewAiReport'
  | 'home.importanceScore'
  | 'home.statusOk'
  | 'home.radarRunning'
  | 'monitors.title'
  | 'monitors.empty'
  | 'monitors.manage'
  | 'monitors.intel'
  | 'monitors.timeline'
  | 'monitors.settings'
  | 'monitors.computing'
  | 'monitors.create'
  | 'monitors.overviewDesc'
  | 'monitors.emptyOverviewDesc'
  | 'monitors.openManage'
  | 'monitors.listTitle'
  | 'monitors.listCount'
  | 'monitors.heat'
  | 'monitors.updatedAt'
  | 'monitors.hours24'
  | 'monitors.loadDetailFailed'
  | 'monitors.aiActive'
  | 'monitors.lastUpdated'
  | 'monitors.heatIndex'
  | 'monitors.weeklyBrief'
  | 'monitors.statNew24h'
  | 'monitors.statWindowTotal'
  | 'monitors.statActiveSources'
  | 'monitors.trendTitle'
  | 'monitors.last7Days'
  | 'monitors.topKeywords'
  | 'monitors.noTags'
  | 'monitors.latestClues'
  | 'monitors.viewTimeline'
  | 'monitors.noItems'
  | 'monitors.manageDesc'
  | 'monitors.topicRequired'
  | 'monitors.createFailed'
  | 'monitors.deleteConfirm'
  | 'monitors.deleteFailed'
  | 'monitors.emptyManage'
  | 'monitors.createPlaceholder'
  | 'monitors.creating'
  | 'monitors.createProgress.title'
  | 'monitors.createProgress.stepUnderstand'
  | 'monitors.createProgress.stepDescribe'
  | 'monitors.createProgress.stepSources'
  | 'monitors.createProgress.stepIndex'
  | 'monitors.createProgress.stepSave'
  | 'monitors.createProgress.stepSnapshot'
  | 'monitors.createProgress.snapshotPending'
  | 'monitors.createProgress.snapshotComputing'
  | 'monitors.createProgress.done'
  | 'monitors.createProgress.failed'
  | 'sources.title'
  | 'sources.all'
  | 'sources.hot'
  | 'sources.searchPlaceholder'
  | 'sources.empty'
  | 'sources.disabled'
  | 'sources.listView'
  | 'sources.cardView'
  | 'sources.filtered'
  | 'sources.searchLabel'
  | 'sources.kindFilter'
  | 'sources.allKinds'
  | 'sources.kindWeb'
  | 'sources.kindRss'
  | 'sources.sortLabel'
  | 'sources.sortNewOld'
  | 'sources.sortOldNew'
  | 'sources.sortNameAz'
  | 'sources.sortNameZa'
  | 'sources.emptyFiltered'
  | 'sources.emptyDefault'
  | 'sources.clearFilters'
  | 'sources.colKind'
  | 'sources.colName'
  | 'sources.colOwner'
  | 'sources.colEntry'
  | 'sources.colTime'
  | 'sources.colOpen'
  | 'sources.official'
  | 'sources.unofficial'
  | 'sources.open'
  | 'sources.pagination'
  | 'sources.prevPage'
  | 'sources.nextPage'
  | 'sources.backToTop'
  | 'datetime.justNow'
  | 'datetime.minutesAgo'
  | 'datetime.hoursAgo'
  | 'datetime.daysAgo'
  | 'datetime.today'
  | 'datetime.yesterday'
  | 'datetime.unknown'
  | 'http.requestFailed'
  | 'http.networkError'
  | 'http.invalidJson'
  | 'auth.loginFailed'
  | 'auth.googleLoginFailed'
  | 'auth.continueWithGoogle'
  | 'auth.googleUnavailable'
  | 'auth.loginModeNav'
  | 'auth.orDivider'
  | 'auth.codeSentLogin'
  | 'auth.forgotPasswordQuestion'
  | 'common.save'
  | 'common.saveFailed'
  | 'common.prevPage'
  | 'common.nextPage'
  | 'common.pageOf'
  | 'common.collapse'
  | 'common.expandFull'
  | 'common.view'
  | 'common.dismiss'
  | 'monitors.invalidId'
  | 'monitors.timeWindow'
  | 'monitors.window24h'
  | 'monitors.window3d'
  | 'monitors.window7d'
  | 'monitors.window30d'
  | 'monitors.settingsDesc'
  | 'monitors.minSimilarity'
  | 'monitors.minSimilarityHint'
  | 'monitors.minSimilarityAria'
  | 'monitors.clusterMoreSources'
  | 'monitors.clusterMoreItems'
  | 'monitors.relevanceLabel'
  | 'monitors.clusterDrawerTitle'
  | 'monitors.clusterDrawerDesc'
  | 'monitors.clusterEmpty'
  | 'profile.security'
  | 'profile.oldPassword'
  | 'profile.newPassword'
  | 'profile.oldPasswordPlaceholder'
  | 'profile.updatePassword'
  | 'profile.updatingPassword'
  | 'profile.displayNamePlaceholder'
  | 'profile.langZhCN'
  | 'profile.langEn'
  | 'profile.langJa'
  | 'profile.langKo'
  | 'layout.profileAria'
  | 'env.devTitle'
  | 'env.devDetail'
  | 'env.demoTitle'
  | 'env.demoDetail'
  | 'legal.termsTitle'
  | 'legal.termsBody'
  | 'legal.privacyTitle'
  | 'legal.privacyBody';

export const en: Record<WebTranslationKey, string> = {
  'app.tagline': 'Personal intelligence assistant',
  'nav.home': 'Home',
  'nav.monitors': 'Monitors',
  'nav.manage': 'Manage',
  'nav.sources': 'Sources',
  'nav.notifications': 'Notifications',
  'nav.profile': 'Profile',
  'nav.logout': 'Log out',
  'auth.login': 'Sign in',
  'auth.register': 'Create account',
  'auth.passwordMode': 'Password',
  'auth.otpMode': 'Email code',
  'auth.account': 'Email or username',
  'auth.password': 'Password',
  'auth.email': 'Email',
  'auth.sendCode': 'Send code',
  'auth.noAccount': "Don't have an account? Sign up",
  'auth.registerSubtitle': 'Register with an email verification code',
  'auth.forgotPassword': 'Reset password',
  'auth.forgotSubtitle': 'We will email a verification code, valid for 15 minutes',
  'auth.codeLabel': '6-digit code',
  'auth.passwordMin': 'Password (min. 6 characters)',
  'auth.confirmPassword': 'Confirm password',
  'auth.passwordPlaceholder': 'At least 6 characters',
  'auth.confirmPlaceholder': 'Enter again',
  'auth.acceptTerms': 'I have read and agree to the',
  'auth.termsOfService': 'Terms of Service',
  'auth.privacyPolicy': 'Privacy Policy',
  'auth.conjunctionAnd': 'and',
  'auth.acceptTermsRequired': 'Please read and accept the Terms of Service and Privacy Policy',
  'auth.requestCodeFirst': 'Please request an email verification code first',
  'auth.resendCode': 'Resend code',
  'auth.resendInSeconds': 'Resend in {{seconds}}s',
  'auth.codeSentRegister': 'Code sent to your email, valid for 15 minutes (check spam).',
  'auth.registerSubmit': 'Sign up & sign in',
  'auth.hasAccount': 'Already have an account? Sign in',
  'auth.sendFailed': 'Failed to send code',
  'auth.registerFailed': 'Registration failed',
  'auth.resetCodeSent': 'If this email is registered, we sent a code — check your inbox (and spam).',
  'auth.resetSuccess': 'Password reset. Sign in with your new password.',
  'auth.resetFailed': 'Password reset failed',
  'auth.newPassword': 'New password (min. 6 characters)',
  'auth.resetPassword': 'Reset password',
  'auth.backToLogin': 'Back to sign in',
  'profile.title': 'Profile',
  'profile.subtitle': 'Account & security',
  'profile.username': 'Username',
  'profile.email': 'Email',
  'profile.timezone': 'Time zone',
  'profile.language': 'Language',
  'profile.save': 'Save profile',
  'profile.saving': 'Saving…',
  'profile.saved': 'Profile saved',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',
  'common.all': 'All',
  'common.loadFailed': 'Load failed',
  'common.user': 'User',
  'common.delete': 'Delete',
  'common.deleting': 'Deleting…',
  'common.filtered': 'Filtered',
  'common.manage': 'Manage',
  'common.refreshing': 'Refreshing…',
  'common.submitting': 'Submitting…',
  'common.sending': 'Sending…',
  'common.required': 'Required',
  'feed.translate': 'Translate',
  'feed.showOriginal': 'Show original',
  'feed.translating': 'Translating…',
  'notifications.title': 'Notifications',
  'notifications.empty': 'No notifications yet',
  'notifications.markAllRead': 'Mark all read',
  'notifications.detail': 'Notification detail',
  'notifications.openTimeline': 'Open timeline',
  'notifications.openSource': 'Read original',
  'notifications.markRead': 'Mark read',
  'notifications.read': 'Read',
  'notifications.recommendReason': 'Why it matters',
  'notifications.viewOriginal': 'View original',
  'notifications.unread': '{{count}} unread',
  'notifications.operationFailed': 'Operation failed',
  'notifications.markReadFailed': 'Failed to mark as read',
  'notifications.unnamedMonitor': 'Untitled monitor',
  'notifications.reasonPending': 'Generating recommendation…',
  'home.welcome': 'Welcome',
  'home.subtitle': 'Cross-topic intelligence workspace',
  'home.feed': 'Live feed',
  'home.alerts': 'Recent alerts',
  'home.searchPlaceholder': 'Search intelligence…',
  'home.intel': 'Intel',
  'home.importance': 'Importance',
  'home.viewOriginal': 'View original',
  'home.greeting': '👋 Hello, {{name}}',
  'home.welcomeDesc': 'AI has filtered the latest clues from your monitors, mixed by time.',
  'home.filterByTopic': 'Filter by topic',
  'home.allMonitors': 'All monitors',
  'home.searchExtended': 'Search signals, trends, AI snippets…',
  'home.loadFeedFailed': 'Failed to load intelligence feed',
  'home.noMonitors': 'No monitors yet',
  'home.noMonitorsDesc': 'After creating your first monitor, this page shows a cross-topic live feed and alert summary.',
  'home.metricTopics': 'Monitors',
  'home.metricTopicsHint': 'Active topics',
  'home.metricTodayCount': 'Today\'s intel',
  'home.metricTodayHint': 'New items in last 24h',
  'home.metricReadyRate': 'Brief ready rate',
  'home.metricReadyHint': 'Monitors with ready snapshots',
  'home.alertsUrgent': 'Urgent push',
  'home.noAlerts': 'No unread or recent alerts',
  'home.loadingFeed': 'Loading feed…',
  'home.feedEmpty': 'No matching items. Wait for ingestion or create a monitor.',
  'home.feedAiHint': 'AI-filtered feed',
  'home.viewAiReport': 'Open AI brief',
  'home.importanceScore': 'Importance {{score}}',
  'home.statusOk': 'System: OK',
  'home.radarRunning': 'Radar: running',
  'monitors.title': 'Monitors',
  'monitors.empty': 'No monitors yet',
  'monitors.manage': 'Manage monitors',
  'monitors.intel': 'Intelligence',
  'monitors.timeline': 'Timeline',
  'monitors.settings': 'Settings',
  'monitors.computing': 'Computing…',
  'monitors.create': 'Create monitor',
  'monitors.overviewDesc': 'Cross-topic updates and trends. AI extracts key clues and context.',
  'monitors.emptyOverviewDesc': 'Create a monitor in Manage to view AI briefs and trends here.',
  'monitors.openManage': 'Open manage',
  'monitors.listTitle': 'Monitor list',
  'monitors.listCount': '{{count}} total',
  'monitors.heat': 'Heat',
  'monitors.updatedAt': 'Updated {{time}}',
  'monitors.hours24': '(24h)',
  'monitors.loadDetailFailed': 'Failed to load monitor details',
  'monitors.aiActive': 'AI monitoring',
  'monitors.lastUpdated': 'Last updated {{time}}',
  'monitors.heatIndex': 'Heat Index',
  'monitors.weeklyBrief': 'Weekly brief',
  'monitors.statNew24h': '24H new',
  'monitors.statWindowTotal': 'In window',
  'monitors.statActiveSources': 'Active sources',
  'monitors.trendTitle': 'Trend & heat',
  'monitors.last7Days': 'Last 7 days',
  'monitors.topKeywords': 'Top entities / keywords',
  'monitors.noTags': 'No tag data',
  'monitors.latestClues': 'Latest clues',
  'monitors.viewTimeline': 'View timeline',
  'monitors.noItems': 'No matching items. Wait for ingestion or adjust sources and similarity.',
  'monitors.manageDesc': 'Create and delete monitors; open intel, timeline, or settings.',
  'monitors.topicRequired': 'Please enter a monitor topic',
  'monitors.createFailed': 'Failed to create monitor',
  'monitors.deleteConfirm': 'Delete monitor "{{title}}"?',
  'monitors.deleteFailed': 'Failed to delete',
  'monitors.emptyManage': 'No monitors yet. Enter a topic below; then view AI briefs in Overview.',
  'monitors.createPlaceholder': 'Topic to monitor, e.g. LLM adoption in medical imaging and regulation…',
  'monitors.creating': 'Creating…',
  'monitors.createProgress.title': 'Creating monitor',
  'monitors.createProgress.stepUnderstand': 'Understanding your topic',
  'monitors.createProgress.stepDescribe': 'Generating description & keywords',
  'monitors.createProgress.stepSources': 'Matching sources',
  'monitors.createProgress.stepIndex': 'Building semantic index',
  'monitors.createProgress.stepSave': 'Saving configuration',
  'monitors.createProgress.stepSnapshot': 'Generating intelligence snapshot',
  'monitors.createProgress.snapshotPending': 'Snapshot queued…',
  'monitors.createProgress.snapshotComputing': 'Aggregating last 7 days…',
  'monitors.createProgress.done': 'Monitor ready',
  'monitors.createProgress.failed': 'Creation failed — please retry',
  'sources.title': 'Sources',
  'sources.all': 'All',
  'sources.hot': 'Hot',
  'sources.searchPlaceholder': 'Search sources…',
  'sources.empty': 'No sources',
  'sources.disabled': 'Disabled',
  'sources.listView': 'List',
  'sources.cardView': 'Cards',
  'sources.filtered': 'Filtered',
  'sources.searchLabel': 'Search display name or note',
  'sources.kindFilter': 'Type',
  'sources.allKinds': 'All types',
  'sources.kindWeb': 'Website',
  'sources.kindRss': 'RSS',
  'sources.sortLabel': 'Sort',
  'sources.sortNewOld': 'Time · new → old',
  'sources.sortOldNew': 'Time · old → new',
  'sources.sortNameAz': 'Name · A → Z',
  'sources.sortNameZa': 'Name · Z → A',
  'sources.emptyFiltered': 'No results for current filters. Try clearing filters.',
  'sources.emptyDefault': 'The source pool is maintained by admins. Bind sources when configuring monitors.',
  'sources.clearFilters': 'Clear filters',
  'sources.colKind': 'Type',
  'sources.colName': 'Name',
  'sources.colOwner': 'Owner',
  'sources.colEntry': 'Entry',
  'sources.colTime': 'Time',
  'sources.colOpen': 'Open',
  'sources.official': 'Official',
  'sources.unofficial': 'Unofficial',
  'sources.open': 'Open',
  'sources.pagination': '{{total}} items · page {{page}}',
  'sources.prevPage': 'Previous',
  'sources.nextPage': 'Next',
  'sources.backToTop': 'Back to top',
  'datetime.justNow': 'Just now',
  'datetime.minutesAgo': '{{count}} min ago',
  'datetime.hoursAgo': '{{count}} h ago',
  'datetime.daysAgo': '{{count}} d ago',
  'datetime.today': 'Today {{time}}',
  'datetime.yesterday': 'Yesterday {{time}}',
  'datetime.unknown': 'Unknown time',
  'http.requestFailed': 'Request failed',
  'http.networkError': 'Network error',
  'http.invalidJson': 'Invalid response',
  'auth.loginFailed': 'Sign in failed',
  'auth.googleLoginFailed': 'Google sign-in failed',
  'auth.continueWithGoogle': 'Continue with Google',
  'auth.googleUnavailable': 'Cannot reach Google services. Check your network or use email sign-in.',
  'auth.loginModeNav': 'Sign-in method',
  'auth.orDivider': 'or',
  'auth.codeSentLogin': 'Code sent to your email, valid for 15 minutes (check spam).',
  'auth.forgotPasswordQuestion': 'Forgot password?',
  'common.save': 'Save',
  'common.saveFailed': 'Save failed',
  'common.prevPage': 'Previous',
  'common.nextPage': 'Next',
  'common.pageOf': 'Page {{page}} / {{total}}',
  'common.collapse': 'Collapse',
  'common.expandFull': 'Show more',
  'common.view': 'View',
  'common.dismiss': 'Dismiss notice',
  'monitors.invalidId': 'Invalid monitor ID',
  'monitors.timeWindow': 'Time window',
  'monitors.window24h': '24h',
  'monitors.window3d': '3 days',
  'monitors.window7d': '7 days',
  'monitors.window30d': '30 days',
  'monitors.settingsDesc': 'Bind sources and set the semantic similarity threshold. Only enabled sources apply. Timeline filters after save.',
  'monitors.minSimilarity': 'Minimum semantic similarity',
  'monitors.minSimilarityHint': 'Show items with similarity ≥ this value to the monitor topic. Higher = stricter, fewer items.',
  'monitors.minSimilarityAria': 'Minimum similarity',
  'monitors.clusterMoreSources': '{{count}} more sources reported the same event',
  'monitors.clusterMoreItems': '{{count}} more similar reports',
  'monitors.relevanceLabel': 'Relevance {{score}}',
  'monitors.clusterDrawerTitle': 'Similar reports',
  'monitors.clusterDrawerDesc': 'Other entries on bound sources for the same event',
  'monitors.clusterEmpty': 'No other reports',
  'profile.security': 'Security',
  'profile.oldPassword': 'Current password',
  'profile.newPassword': 'New password',
  'profile.oldPasswordPlaceholder': 'Current password',
  'profile.updatePassword': 'Update password',
  'profile.updatingPassword': 'Updating…',
  'profile.displayNamePlaceholder': 'Display name',
  'profile.langZhCN': '简体中文',
  'profile.langEn': 'English',
  'profile.langJa': '日本語',
  'profile.langKo': '한국어',
  'layout.profileAria': 'Profile',
  'env.devTitle': 'Development',
  'env.devDetail': 'Unstable features and data; may reset anytime. Do not use for production or sensitive info.',
  'env.demoTitle': 'Demo',
  'env.demoDetail': 'Data is cleared periodically. Do not change shared data or upload sensitive info.',
  'legal.termsTitle': 'Terms of Service (placeholder)',
  'legal.termsBody': 'This product provides source URL management and links to official sites. Replace with lawyer-reviewed terms before launch, covering scope, user obligations, and disclaimers.',
  'legal.privacyTitle': 'Privacy Policy (placeholder)',
  'legal.privacyBody': 'We collect email for login and account management, plus sources and settings you add. Replace with a full privacy policy compliant with applicable laws before launch.',
};
