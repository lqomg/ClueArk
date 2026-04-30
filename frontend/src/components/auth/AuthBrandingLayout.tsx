import { Link } from 'react-router-dom';
import { GithubRepoLink } from '@/components/GithubRepoLink';

const inputClass =
  'w-full px-5 py-4 rounded-lg bg-white/5 border border-white/10 text-ark-text placeholder:text-slate-600 focus:border-ark-accent/50 focus:bg-white/[0.08] transition-all outline-none text-sm';

const primaryBtnClass =
  'relative w-full py-4 rounded-lg bg-ark-accent text-black font-bold text-sm tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-ark-accent/20 disabled:opacity-50 disabled:hover:scale-100';

export { inputClass, primaryBtnClass };

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
          <Link to="/login" className="mb-10 inline-flex items-center gap-2 grayscale opacity-90 transition-all hover:grayscale-0">
            <span className="text-2xl font-black tracking-tighter">线索</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ark-accent p-0.5">
              <div className="h-full w-full rounded-full border border-ark-accent/50" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-ark-accent">方舟</span>
          </Link>

          <div className="max-w-xl space-y-6 md:space-y-8">
            <h2 className="text-4xl font-black leading-[0.95] tracking-tighter text-white lg:text-6xl">
              私人情报系统的
              <br />
              <span className="text-ark-accent">核心底座</span>
            </h2>
            <p className="max-w-md text-base font-light leading-relaxed text-slate-400 lg:text-lg">
              由繁入简，从信源开始搭建你的私人情报方舟。每一条动态都是通向未来的线索。
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-10 grid grid-cols-2 gap-8 pb-6 md:mt-12 md:gap-12 md:pb-10">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">结构化管理</h4>
            <div className="mb-3 h-px w-8 bg-ark-accent opacity-40" />
            <p className="text-xs leading-relaxed text-slate-500">行业分类、标签标记，让信源池清晰可检索。</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">内置信源库</h4>
            <div className="mb-3 h-px w-8 bg-ark-accent opacity-40" />
            <p className="text-xs leading-relaxed text-slate-500">覆盖常见投融资、政策与科技媒体场景，一键加入我的池。</p>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[-20%] top-[-20%] h-[min(800px,120vw)] w-[min(800px,120vw)] animate-pulse rounded-full bg-ark-accent opacity-[0.04] blur-[120px] md:blur-[200px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[min(600px,90vw)] w-[min(600px,90vw)] rounded-full bg-ark-accent opacity-[0.06] blur-[100px] md:blur-[150px]" />
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-ark-bg p-6 md:p-8">
        <div className="w-full max-w-sm space-y-8 md:space-y-10">
          <div className="text-center">
            <h3 className="mb-2 text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h3>
            <p className="text-sm font-light text-slate-500">{subtitle}</p>
          </div>
          {children}
          <p className="px-1 text-center text-[12px] gap-1  leading-loose tracking-[0.2em] ">
            管理员账号：
            admin@clueark.local / lin123456qian
          </p>
          <p className=" text-center text-[12px] gap-1  leading-loose tracking-[0.2em] text-red-600">
            此为演示环境，请勿乱修改相关数据，以免影响其他用户使用。将定期清理数据，请勿上传敏感信息。
          </p>
          <div className="flex justify-center pt-1">
            <GithubRepoLink className="px-2 py-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
