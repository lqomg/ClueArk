import { GithubRepoLink } from '@/components/GithubRepoLink';
import { ProductMark } from '@/components/brand/ProductMark';

const inputClass =
  'w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-ark-text placeholder:text-slate-600 focus:border-ark-accent/50 focus:bg-white/[0.08] transition-all outline-none text-sm';

const primaryBtnClass =
  'relative w-full py-3 rounded-lg bg-ark-accent text-black font-semibold text-sm tracking-wide hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-ark-accent/15 disabled:opacity-50 disabled:hover:scale-100';

const outlineBtnClass =
  'relative w-full py-3 rounded-lg border border-white/15 bg-white/[0.03] text-slate-200 font-semibold text-sm tracking-wide transition-all hover:bg-white/[0.06] active:scale-[0.99] disabled:opacity-50';

/** 与邮箱同排的「发送验证码」：不占满行、高度与输入框对齐（配合 items-stretch） */
const sendCodeBtnClass =
  'inline-flex shrink-0 select-none items-center justify-center self-stretch rounded-lg border border-white/15 bg-white/[0.06] px-2.5 text-[11px] font-semibold text-slate-100 transition hover:bg-white/[0.1] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 sm:px-3 sm:text-xs';

/** 横向表单里与按钮同排的输入框：占满剩余宽度 */
const inputFlexClass = `${inputClass} min-w-0 flex-1`;

export { inputClass, inputFlexClass, outlineBtnClass, primaryBtnClass, sendCodeBtnClass };

export function AuthBrandingLayout({
  title,
  subtitle,
  children,
  showLegalFooter = true,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** 注册页已在表单内勾选协议，可关闭底部声明 */
  showLegalFooter?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col font-sans text-white md:h-screen md:flex-row md:overflow-hidden">
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden border-ark-border bg-ark-sidebar p-10 text-white md:border-r md:p-16 lg:p-24">
        <div className="relative z-10">
          <ProductMark
            variant="auth"
            to="/login"
            className="mb-10 grayscale opacity-90 hover:grayscale-0"
          />

          <div className="max-w-xl space-y-6 md:space-y-8">
            <h2 className="text-4xl font-black leading-[0.95] tracking-tighter text-white lg:text-6xl">
              个人与团队的
              <br />
              <span className="text-ark-accent">AI 情报工作台</span>
            </h2>
            <p className="max-w-md text-base font-light leading-relaxed text-slate-400 lg:text-lg">
              围绕话题监控组织信息流，接入订阅、网页与热点等公开信源；在同一信源池上筛选与浏览，把冗杂更新收成可跟进的线索。
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-10 grid grid-cols-2 gap-8 pb-6 md:mt-12 md:gap-12 md:pb-10">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">话题监控</h4>
            <div className="mb-3 h-px w-8 bg-ark-accent opacity-40" />
            <p className="text-xs leading-relaxed text-slate-500">
              按关键词或话题筛选统一信源池，时间线聚合浏览，并支持新内容提醒。
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">多路径采集</h4>
            <div className="mb-3 h-px w-8 bg-ark-accent opacity-40" />
            <p className="text-xs leading-relaxed text-slate-500">
              支持订阅源、网页列表与公开热点数据；内置目录与自建信源共用同一套类型与策略。
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[-20%] top-[-20%] h-[min(800px,120vw)] w-[min(800px,120vw)] animate-pulse rounded-full bg-ark-accent opacity-[0.04] blur-[120px] md:blur-[200px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[min(600px,90vw)] w-[min(600px,90vw)] rounded-full bg-ark-accent opacity-[0.06] blur-[100px] md:blur-[150px]" />
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-ark-bg p-6 md:p-8">
        <div className="w-full max-w-sm space-y-5 md:space-y-6">
          <div className="text-center">
            <h3 className="mb-2 text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h3>
            <p className="text-sm font-light text-slate-500">{subtitle}</p>
          </div>
          {children}
          {showLegalFooter ? (
            <>
              <p className="px-1 text-center text-[12px] gap-1  leading-loose tracking-[0.2em] ">
                演示环境账号：
                <span className="font-mono text-slate-400">show@clueark.com</span> 
                / <span className="font-mono text-slate-400">123456qian</span>
              </p>
              <p className=" text-center text-[12px] gap-1  leading-loose tracking-[0.2em] text-red-600">
                此为演示环境，请勿乱修改相关数据，以免影响其他用户使用。将定期清理数据，请勿上传敏感信息。
              </p>
            </>
          ) : null}
          <div className="flex justify-center pt-1">
            <GithubRepoLink className="px-2 py-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
