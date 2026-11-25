import fs from 'fs';

const newKeys = [
  'common.close',
  'auth.dialogEyebrow',
  'auth.dialogTitle',
  'auth.dialogSubtitle',
  'auth.dialogKeepBrowsing',
  'auth.noAccountShort',
  'auth.emailAlreadyRegistered',
  'public.discoveryEyebrow',
  'public.discoveryTitle',
  'public.discoverySubtitle',
  'public.searchPlaceholder',
  'public.searchAction',
  'public.heroHint',
  'public.officialUpdated',
  'public.importantOnly',
  'public.noComplexSetup',
  'public.loginContext',
  'public.startCreate',
  'public.openWorkspace',
  'public.navLabel',
  'public.navMethod',
  'public.manifestoEyebrow',
  'public.manifestoTitle',
  'public.manifestoBody',
  'public.howEyebrow',
  'public.howTitle',
  'public.howBody',
  'public.howStepOne',
  'public.howStepOneBody',
  'public.howStepTwo',
  'public.howStepTwoBody',
  'public.howStepThree',
  'public.howStepThreeBody',
  'public.examplesEyebrow',
  'public.examplesTitle',
  'public.example1Category',
  'public.example1Title',
  'public.example1Desc',
  'public.example1Prompt',
  'public.example2Category',
  'public.example2Title',
  'public.example2Desc',
  'public.example2Prompt',
  'public.example3Category',
  'public.example3Title',
  'public.example3Desc',
  'public.example3Prompt',
  'public.example4Category',
  'public.example4Title',
  'public.example4Desc',
  'public.example4Prompt',
  'public.faqEyebrow',
  'public.faqTitle',
  'public.faqQ1',
  'public.faqA1',
  'public.faqQ2',
  'public.faqA2',
  'public.faqQ3',
  'public.faqA3',
  'public.supportTitle',
  'public.supportBody',
  'public.openSource',
];

const enValues = {
  'common.close': 'Close',
  'auth.dialogEyebrow': 'Welcome to ClueArk',
  'auth.dialogTitle': 'Sign in to continue',
  'auth.dialogSubtitle': 'Topics, subscriptions, and alerts stay in one workspace.',
  'auth.dialogKeepBrowsing': 'Keep browsing',
  'auth.noAccountShort': 'Create account',
  'auth.emailAlreadyRegistered': 'This email is already registered.',
  'public.discoveryEyebrow': 'ClueArk · Living topic briefs',
  'public.discoveryTitle': 'Only real developments. Alerts when it actually moves.',
  'public.discoverySubtitle':
    'Name a topic. ClueArk watches public sources around the clock, drops restatements and noise, and writes real changes into one timeline—then alerts you when it matters.',
  'public.searchPlaceholder': 'What do you want to follow? e.g. AI chip export controls…',
  'public.searchAction': 'Create topic',
  'public.heroHint': 'News sites, RSS, and public feeds · every development links back to evidence',
  'public.officialUpdated': '24/7 topic monitoring',
  'public.importantOnly': 'Noise filtered first',
  'public.noComplexSetup': 'Alerts only on progress',
  'public.loginContext': 'Sign in to ClueArk',
  'public.startCreate': 'New topic',
  'public.openWorkspace': 'Open workspace',
  'public.navLabel': 'Navigation',
  'public.navMethod': 'How it works',
  'public.manifestoEyebrow': 'Why ClueArk',
  'public.manifestoTitle': 'Not another feed—a living brief on what you care about.',
  'public.manifestoBody':
    'The hard part is rarely missing news; it is seeing whether anything actually changed. ClueArk watches public sources, blocks noise, and keeps real developments with original evidence on one timeline.',
  'public.howEyebrow': 'How it works',
  'public.howTitle': 'Three steps',
  'public.howBody': 'No hand-written rules. No subscription list to babysit.',
  'public.howStepOne': 'Say what you want to follow',
  'public.howStepOneBody': 'People, companies, policy, or events—or start from an example topic.',
  'public.howStepTwo': 'We watch; only real changes enter the timeline',
  'public.howStepTwoBody':
    'Related sources are monitored. Restatements stay out; meaningful shifts become developments.',
  'public.howStepThree': 'Get notified when it moves',
  'public.howStepThreeBody': 'When a development is written, you can open it and jump straight to evidence.',
  'public.examplesEyebrow': 'Ways to watch',
  'public.examplesTitle': 'Start with topics like these.',
  'public.example1Category': 'Person',
  'public.example1Title': 'What they said themselves',
  'public.example1Desc': 'Follow primary statements—not second-hand commentary.',
  'public.example1Prompt': 'Track primary public statements only; skip commentary and rumor.',
  'public.example2Category': 'Technology',
  'public.example2Title': 'Major model releases',
  'public.example2Desc': 'Notify on real releases; skip hype and trivia.',
  'public.example2Prompt': 'Alert me when major AI models are released; skip evaluation gossip.',
  'public.example3Category': 'Company',
  'public.example3Title': 'Hard company progress',
  'public.example3Desc': 'Products, earnings, leadership statements—not stock chatter.',
  'public.example3Prompt':
    'Follow product launches, earnings, and leadership statements; skip stock noise.',
  'public.example4Category': 'Policy',
  'public.example4Title': 'Where the rule landed',
  'public.example4Desc': 'Official texts and enforcement—not endless opinion pieces.',
  'public.example4Prompt':
    'Track official texts, implementing rules, and enforcement—not secondary takes.',
  'public.faqEyebrow': 'FAQ',
  'public.faqTitle': 'FAQ',
  'public.faqQ1': 'What is ClueArk?',
  'public.faqA1':
    'A living topic brief. You name what to watch; it monitors public sources and writes only real developments into a timeline.',
  'public.faqQ2': 'How is it different from news apps or RSS?',
  'public.faqA2':
    'Those are feeds. ClueArk is topic-first: items pass a gate, noise is dropped, and every conclusion links back to evidence.',
  'public.faqQ3': 'When do I get alerts?',
  'public.faqA3': 'When something passes the gate and becomes a development—not on every restatement.',
  'public.supportTitle': 'More questions?',
  'public.supportBody': 'Open an issue on GitHub, or self-host with the MIT repo.',
  'public.openSource': 'Open-source repo',
};

const zhValues = {
  'common.close': '关闭',
  'auth.dialogEyebrow': '欢迎来到观枢',
  'auth.dialogTitle': '登录后继续',
  'auth.dialogSubtitle': '专题、订阅和提醒会保存在同一个工作台里。',
  'auth.dialogKeepBrowsing': '先继续浏览',
  'auth.noAccountShort': '注册邮箱账号',
  'auth.emailAlreadyRegistered': '该邮箱已注册。',
  'public.discoveryEyebrow': '观枢 ClueArk · 活的专题简报',
  'public.discoveryTitle': '只留下真正的进展，到了立刻提醒。',
  'public.discoverySubtitle':
    '写下专题。观枢全天候盯公开信源，滤掉重复与噪音，把实质变化写入一条进展时间线；真正需要时，再用推送或邮件通知你。',
  'public.searchPlaceholder': '想跟进什么话题？例如：AI 芯片出口管制、某公司战略动向…',
  'public.searchAction': '创建专题',
  'public.heroHint': '支持新闻站点、RSS 与公开信源 · 每条进展都能回到原始证据',
  'public.officialUpdated': '全天候专题监控',
  'public.importantOnly': '重复噪音先滤掉',
  'public.noComplexSetup': '有进展才提醒',
  'public.loginContext': '登录观枢',
  'public.startCreate': '创建专题',
  'public.openWorkspace': '进入工作台',
  'public.navLabel': '导航',
  'public.navMethod': '怎么用',
  'public.manifestoEyebrow': '为什么用观枢',
  'public.manifestoTitle': '不是信息流，是你关注之事的活简报。',
  'public.manifestoBody':
    '日常难的不是缺消息，而是从海量重复报道里看清事情到底有没有新变化。观枢替你全天候守着公开信源，挡住转述与噪音，把真正的进展和原始证据放在同一条时间线里。',
  'public.howEyebrow': '怎么用',
  'public.howTitle': '三步就够',
  'public.howBody': '不用手写规则，也不用自己维护订阅列表。',
  'public.howStepOne': '说出你想跟进的专题',
  'public.howStepOneBody': '人物、公司、政策或事件都可以；也可以先从示例专题开始。',
  'public.howStepTwo': '我们盯着；只有真变化进时间线',
  'public.howStepTwoBody': '自动盯住相关公开信源。转载与水文挡在门外，局面真的变了才写成进展。',
  'public.howStepThree': '有进展再通知你',
  'public.howStepThreeBody': '进展写成后可打开查看，并回到原始证据。',
  'public.examplesEyebrow': '可以这样盯',
  'public.examplesTitle': '先从这类专题开始。',
  'public.example1Category': '人物',
  'public.example1Title': '本人怎么说',
  'public.example1Desc': '只跟公开发言和正式表态，不追转述与评论。',
  'public.example1Prompt': '只跟本人公开发言和正式表态，跳过转述与八卦。',
  'public.example2Category': '技术',
  'public.example2Title': '重大模型发布',
  'public.example2Desc': '重大模型一发布就通知我，测评八卦可以略过。',
  'public.example2Prompt': '重大模型正式发布时通知我，跳过测评八卦。',
  'public.example3Category': '公司',
  'public.example3Title': '硬进展',
  'public.example3Desc': '产品、财报、管理层表态；股价波动不用跟。',
  'public.example3Prompt': '跟新产品、财报与管理层公开表态，跳过股价波动。',
  'public.example4Category': '政策',
  'public.example4Title': '规则落到哪了',
  'public.example4Desc': '正式文本、细则与执法；少看二手解读。',
  'public.example4Prompt': '跟正式文本、实施细则和执法进展，少看二手解读。',
  'public.faqEyebrow': '常见问题',
  'public.faqTitle': '常见问题',
  'public.faqQ1': '观枢是什么？',
  'public.faqA1':
    '一份活的专题简报。你说想盯什么，它就持续看着公开信源，只把真正的新进展写成进展时间线。',
  'public.faqQ2': '和新闻 App、RSS 阅读器有什么不同？',
  'public.faqA2':
    '那些是信息流。观枢是专题优先：条目先过门禁，重复转述和噪音被挡掉，每个结论都能回到原始证据。',
  'public.faqQ3': '什么时候会提醒我？',
  'public.faqA3': '有条目通过门禁、被写成进展的时候，而不是每条转载都打扰你。',
  'public.supportTitle': '还有问题？',
  'public.supportBody': '可在 GitHub 提 issue，或按 MIT 协议私有化部署本仓库。',
  'public.openSource': '开源仓库',
};

const jaValues = { ...enValues };
Object.assign(jaValues, {
  'common.close': '閉じる',
  'auth.dialogEyebrow': 'ClueArk へようこそ',
  'auth.dialogTitle': '続行するにはログイン',
  'auth.dialogSubtitle': 'トピック・購読・通知は同じワークスペースに保存されます。',
  'auth.dialogKeepBrowsing': '閲覧を続ける',
  'auth.noAccountShort': 'アカウント作成',
  'auth.emailAlreadyRegistered': 'このメールは既に登録されています。',
  'public.discoveryEyebrow': 'ClueArk · 生きたトピック要約',
  'public.discoveryTitle': '本当の進展だけ残し、動いたらすぐ知らせる。',
  'public.searchAction': 'トピック作成',
  'public.startCreate': 'トピック作成',
  'public.openWorkspace': 'ワークスペースへ',
  'public.faqTitle': 'よくある質問',
  'public.openSource': 'オープンソース',
});

const koValues = { ...enValues };
Object.assign(koValues, {
  'common.close': '닫기',
  'auth.dialogEyebrow': 'ClueArk에 오신 것을 환영합니다',
  'auth.dialogTitle': '계속하려면 로그인',
  'auth.dialogSubtitle': '토픽·구독·알림이 하나의 워크스페이스에 저장됩니다.',
  'auth.dialogKeepBrowsing': '계속 둘러보기',
  'auth.noAccountShort': '계정 만들기',
  'auth.emailAlreadyRegistered': '이미 등록된 이메일입니다.',
  'public.discoveryEyebrow': 'ClueArk · 살아있는 토픽 브리프',
  'public.discoveryTitle': '진짜 진전만 남기고, 움직일 때 바로 알립니다.',
  'public.searchAction': '토픽 만들기',
  'public.startCreate': '토픽 만들기',
  'public.openWorkspace': '워크스페이스 열기',
  'public.faqTitle': '자주 묻는 질문',
  'public.openSource': '오픈소스 저장소',
});

function valueBlock(values) {
  return Object.entries(values)
    .map(([k, v]) => `  '${k}': ${JSON.stringify(v)},`)
    .join('\n');
}

function patchEn(path) {
  let s = fs.readFileSync(path, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  if (!s.includes("'common.close'")) {
    const keyLines = newKeys.map((k) => `  | '${k}'`).join(nl);
    s = s.replace(
      `  | 'auth.emailPlaceholder'${nl}`,
      `  | 'auth.emailPlaceholder'${nl}${keyLines}${nl}`,
    );
  }
  if (!s.includes("'auth.dialogEyebrow':")) {
    s = s.replace(
      `  'auth.emailPlaceholder': 'name@company.com',${nl}`,
      `  'auth.emailPlaceholder': 'name@company.com',${nl}${valueBlock(enValues).split('\n').join(nl)}${nl}`,
    );
  }
  fs.writeFileSync(path, s);
  console.log('patched en');
}

function patchLocale(path, values) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes("'auth.dialogEyebrow':")) {
    console.log('skip', path);
    return;
  }
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const block = valueBlock(values).split('\n').join(nl) + nl;
  if (s.includes("'auth.emailPlaceholder'")) {
    s = s.replace(/  'auth\.emailPlaceholder': '[^']*',\r?\n/, (m) => m + block);
  } else {
    s = s.replace(/  'auth\.login': '[^']*',\r?\n/, (m) => m + block);
  }
  fs.writeFileSync(path, s);
  console.log('patched', path);
}

patchEn('src/i18n/locales/en.ts');
patchLocale('src/i18n/locales/zh-CN.ts', zhValues);
patchLocale('src/i18n/locales/ja.ts', jaValues);
patchLocale('src/i18n/locales/ko.ts', koValues);
