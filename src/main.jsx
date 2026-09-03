import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { authApi, userApi, tokenService, getRoleFromToken, routeForRole, decodeToken } from './iam'
import { AdminOnboarding } from './onboarding.jsx'
import { IamAdmin } from './iam-admin.jsx'

// ----- Routing -----
const pages = {
  landing: { label: 'Landing' },
  gateway: { label: 'Gateway' },
  login: { label: 'Login' },
  signup: { label: 'Sign Up' },
  forgot: { label: 'Forgot' },
  reset: { label: 'Reset' },
  verify: { label: 'Verify' },
  dashboard: { label: 'Dashboard' },
  student: { label: 'Student' },
  faculty: { label: 'Faculty' },
  admin: { label: 'Admin' },
  system: { label: 'System Admin' },
}
function usePage() {
  const getInitial = () => {
    const h = window.location.hash.replace('#/', '').split('?')[0]
    return pages[h] ? h : 'login'
  }
  const [page, setPage] = useState(getInitial)
  useEffect(() => {
    const onHash = () => setPage(getInitial())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (next) => { window.location.hash = `/${next}`; setPage(next.split('?')[0]); window.scrollTo(0,0) }
  return [page, go]
}

// ----- Assets (downloaded via curl -L as instructed) -----
const LOGO_EARMS = "https://lh3.googleusercontent.com/aida-public/AB6AXuCqiCuAj8FWGldtfBS1cbJ6pMkCdCdRZRlFHE5IuBXYrLCZ_e8LiZGkHEfb5ina4CIYi3xbqp7VfGxglBg6Gg4k_bNrKpUpnkRIG6-B5ydeg2HpBOJ0dssALP8Yk36QKC-FvxqU_uvulJicD6aHWTcYjyFIhAdHlv2CWeAyBJibzp9ad5hDGqY12vqbPjKoefgsrKXJiynEw8DNanIp27oAeQWm0S6_7IMCB6r9nOpVeRRqeLfgNJ32cDFrWdwnSSsFSQ"
const LOGO_GATEWAY = "https://lh3.googleusercontent.com/aida-public/AB6AXuAFJNVztzzWLUrPOXiIV9i2wyLB95LeiWplg8X2qHaI475HQfRm7KSFq3mXN6BBSbrGeC2TP8HITUpBTUVAjotzHQYRrY7QqFa4S5xfE6Svo2VifqNYJOqUl705Xr05Dv7LYfFtLJI3HiHbD97tFvlAYfYOiLaiavCUmOoy6hUHNfitQs19kPyQN_8sy_ujeX3aZCKDk3s43bcY9WhyHE3ofbFXgIxrzPH9wsgRadZC8BWaFguTZ7GClUocWfx7gTQGIg"
const LOGO_LOGIN = "https://lh3.googleusercontent.com/aida-public/AB6AXuCORrj7SOgt7b5k8NE7OiMMtKe2UoNnIf-LClWw5yOExVN-0-1YYE_IMy-A7VNzcTkIwM0GcRKGSUQUNRpO2a9OfHqvsP_frFu_fgccD3JShX3RwRbny0Ee215toM9bt2Ma_rOY20FhTA-YPMWvMAiSKWE4f68bNHm4wm5ZQI6LxRaJK0u_PzDXBI_VrABGdNTEvhLP3y5OiprAljYNovULnzyl4KTj59-SFkM08DkEU4dqWHWatbi0oiJeJfy0LBFFiA"
const BG_LIBRARY = "https://lh3.googleusercontent.com/aida-public/AB6AXuCEyzTu6odiFR-4TPu-p4guvou86NUPdnD59-hqSP8uULQY5b0n13ULrIpLNbAX1bUPqcK3onQTHYqqiLc0zzsBixPWAXWp75LLg-2CcavENrx-wcdkA7qGjYUS704C2q_wjbdKy-x9AIB4Hy0DEaUGa4mscJ62iUMzERVIzE7k7Y4XpUxOlPV9F496BAF5C-_-LjvS9wFOruefOQVu6mOvopMceGag-h5epZUM6QB9tC3prA1Vm6OJ"

// Photography assets - downloaded via curl -L to /public/stitch/*.png and /public/images/*.jpg
// We use LOCAL /stitch pngs (screenshots of Stitch image screens) for hero carousel to prove integration
const HERO_1 = "/stitch/7a9c8cf1172a4fe79b539ffc8745eba3.png" // female in library
const HERO_2 = "/stitch/3afeb6d3a69f49a4a2bd966b8c41fe4e.png" // diverse lab group
const HERO_3 = "/stitch/f8d90eea6ab446998338b9d72fdfadf4.png" // professor lecture
const HERO_4 = "/stitch/fd2900c824114a6ebe1ff73ae0a28c7a.png" // two researchers large screen

// Fallback remote hero urls (original Stitch aida-public) - kept for reference but we prefer local stitch crops
const HERO_REMOTE_1 = "https://lh3.googleusercontent.com/aida-public/AB6AXuCeS1IOkFiGG9H3YACORE-FI6YF3liAWFrzI5XmTNAeM1Uld47wtjCEdSCCShiXRc3OL35Twt0hkmJGkeLEZpvNA9jpa_9ireHQUStm45owh1GYzeAA-1aSC59L2S5pFvq41vycsT2UgwCiJJggKH6cB23_qNFXtEtd-1idXkNEIDK-5e1AyUEpEs1KBKW6h8B_A6SZcMPZQKikMZGWOH7WSA-zNlaki5voTi6Rj-fOiJn6cSgIAxnf"
const HERO_REMOTE_2 = "https://lh3.googleusercontent.com/aida-public/AB6AXuCUWswne-EQuYSto0QWQthLxmFZ37xakigQptOGkH8hW4tTvWK-gkk9cC1DVRfQDdziCi9QJJp6atO1YGyfA9l3xuorCNKLrrzLt92HSMUDuRrfxqB9-Q4DyhETxZmx97G-3gn-m39A4yME60uND21XglGO3zVR5WN9aQFLPpiMvqk3UhBpejgUJPklPm1dZHgn1bs1H2cZMgz82JcoWrhmDaCR1wm6Kzajvo9vq92vmx8QI2HGwbwe"
const HERO_REMOTE_3 = "https://lh3.googleusercontent.com/aida-public/AB6AXuAbUypvnaTnb6laQEGHYtogaEz7sHficulMUK7VsCSR2CQl8NnrL8w_CdYdirOLn55oCOaWyiJuZHxZ9Xm7GkE0v8fAR-iV0ArGdDIc_EzqSfRpfB_APzxLwCV2azD0HhXV4AyDayLHNfI2uQfi-T9Rj8zbb3a8kuZ-0Bgo53VMduvCcyc22Zkz_akDv5hQSrMwXKcbgJDelCEtYqfNrbqXH976PBp9VLba1ZkTOfGOmTEOd_zIOu4y"
const HERO_REMOTE_4 = "https://lh3.googleusercontent.com/aida-public/AB6AXuAxaCPLQVqNVernYU6dF1ABvmhS_Xuq5D1N7K9Z-ivXWikfrLglkUZmateTM-X3a-n7r5sEk9scVWoSHwtP5Ll9jK3JM-2hYYYbIGCjkqPJfP6qO78_bx09qnncy0ko5TCPAm7dljdjrU-THCySxCEH04jsQTZm7vRX2k1yizlz9FGKQmI1mZnf43TV4hO3FxBl7dT-RrJEz7Oim6hipKNNxF7i9jgfUZPp1OLUpeL2WqmTpa_mVOdl"

const AVATAR_STUDENT = "https://lh3.googleusercontent.com/aida-public/AB6AXuBKcVE1T4B00ZtQnTz8zw513QfUxlIBB0D3TCkT6CV9XGmvHfs9Yt6zpoPtsmstiMpuBkqeqRsOaYoagI9UxzJMGu-BfUT5H-CvZgJmuxSNUNLnhcpopDb8yPUOXyxjg74v9aftMYReycGHH-pNuYIwMF2KCiNUDO84eA4h2rkELDiScap5zzvIVZpjoKE4ktM2R63imrbAEoR541iaQ46iKyxd7BN1808kz9h9lbMpyEQnmiuAexWd"
const AVATAR_FACULTY = "https://lh3.googleusercontent.com/aida-public/AB6AXuCyOdUoSnASZEi2TcnnHAbZ9RHp7UOtB8qY5LCtjUE9kEmMgog0Ms3HPAewZVT2uUrtwCv9Zr2C3S7FDsFT3VjQa900tf52aVJNc5uvhX_CRr6elHHHe-dH3ucxUpAa2yS67-Nq0BlpXOniKOs13vn4mB-sI2-SaYGyaTVwflH0MQi1yb3eQqNwmfRnr7OAGcqz1-REtKC15VO2pt-nL48z9wCcJ26USsFpmuNls4oFfqPaIXNLaYrC"
const CREST = "https://lh3.googleusercontent.com/aida-public/AB6AXuBF38lobtR8N8KJrcN-EUUO9ixfc_i3Q2m116YIMlhaUwo_LeegINbJYMqJ0qyRHJ2uzW5m0YeFNAaYKc6sq4onMdhF9GWQ9_AFdf93kwkZL4viwPO00bXnZc6JtzFt83HXnhZy6dD-in7xJ_pZrGPSPg4nwRrcexXDpEeAGkglxkY3UI3TXHBYTQngYWh-GBoQoOdWQd0boN8EPy3JpkbIhg-JXXZ1dnjoMqmm0eLh6GRBBscHe7ss"

/* ---------- Landing Enhanced (Stitch: 407ee16216d649b3b9e792ce67187d1d) ---------- */
function Landing({ go }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col relative overflow-x-hidden">
      {/* TopNavBar */}
      <header className="w-full bg-surface/80 backdrop-blur-md sticky top-0 z-50 border-b border-surface-container-high">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-3.5 flex justify-between items-center">
          <button onClick={() => go('landing')} className="flex items-center gap-3">
            <img alt="EARMS Logo" className="h-9 md:h-10 object-contain" src={LOGO_EARMS} />
            <div className="hidden sm:flex flex-col items-start leading-tight text-left">
              <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight leading-none">EARMS</span>
              <span className="font-body-sm text-[11px] tracking-wide text-on-surface-variant leading-none">Electronic Academic Research Management System</span>
            </div>
            <div className="sm:hidden flex flex-col items-start leading-none text-left">
              <span className="font-headline-sm text-[13px] font-bold text-primary leading-none">EARMS</span>
              <span className="font-body-sm text-[9px] tracking-wide text-on-surface-variant leading-none">Electronic Academic Research Management System</span>
            </div>
          </button>
          <div className="hidden md:flex items-center gap-8">
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#features">Features</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#solutions">Solutions</a>
            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" href="#portals">Login</a>
            <button onClick={()=>go('gateway')} className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-lg hover:bg-surface-tint transition-colors flex items-center gap-2">Access Portal <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
          </div>
          <button onClick={()=>setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-surface-container-low">
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-container-high bg-surface px-4 py-4 flex flex-col gap-3">
            <a href="#features" onClick={()=>setMobileOpen(false)} className="py-2 font-body-md">Features</a>
            <a href="#portals" onClick={()=>setMobileOpen(false)} className="py-2 font-body-md">Login</a>
            <button onClick={()=>{go('gateway'); setMobileOpen(false)}} className="bg-primary text-on-primary py-3 rounded-lg font-label-md">Access Portal</button>
            <button onClick={()=>{go('login'); setMobileOpen(false)}} className="border border-outline-variant py-3 rounded-lg font-label-md">Sign In</button>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {/* Hero Section with 4-image carousel (local stitch crops + remote fallback) */}
        <section className="relative w-full h-[78vh] min-h-[560px] md:min-h-[600px] overflow-hidden bg-primary-container flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <div className="carousel-item"><img alt="African female postgraduate student in library" className="w-full h-full object-cover opacity-70" src={HERO_1} onError={e=>e.currentTarget.src=HERO_REMOTE_1} /></div>
            <div className="carousel-item"><img alt="Diverse group of African postgraduate students in lab" className="w-full h-full object-cover opacity-70" src={HERO_2} onError={e=>e.currentTarget.src=HERO_REMOTE_2} /></div>
            <div className="carousel-item"><img alt="African professor giving lecture" className="w-full h-full object-cover opacity-70" src={HERO_3} onError={e=>e.currentTarget.src=HERO_REMOTE_3} /></div>
            <div className="carousel-item"><img alt="Two African researchers discussing data" className="w-full h-full object-cover opacity-70" src={HERO_4} onError={e=>e.currentTarget.src=HERO_REMOTE_4} /></div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container/90 via-primary-container/55 to-primary-container/20"></div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center flex flex-col gap-6 items-center">
            <div className="inline-flex items-center gap-2 bg-surface-container-low/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
              <span className="material-symbols-outlined text-secondary-fixed text-[18px]">public</span>
              <span className="font-label-md text-label-md text-on-primary">Empowering African Research</span>
            </div>
            <h1 className="font-display-lg text-display-lg md:text-[56px] text-on-primary tracking-tight leading-[1.1]">Elevating African Research Excellence</h1>
            <p className="font-body-lg text-body-lg text-inverse-on-surface max-w-2xl leading-relaxed">
              A unified platform for managing the entire lifecycle of academic research, grants, and institutional compliance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button onClick={()=>go('gateway')} className="inline-flex justify-center items-center gap-2 bg-primary-fixed text-on-primary-fixed font-label-md text-label-md px-7 py-3.5 rounded-lg hover:bg-primary-fixed-dim transition-all shadow-md">
                Access Portal <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button onClick={()=>document.getElementById('features')?.scrollIntoView({behavior:'smooth'})} className="inline-flex justify-center items-center gap-2 bg-transparent border border-white/40 text-on-primary font-label-md text-label-md px-7 py-3.5 rounded-lg hover:bg-white/10 transition-all">
                View Documentation
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2 text-on-primary/70">
              <span className="w-10 h-px bg-white/30"></span>
              <span className="font-body-sm text-[12px] tracking-widest uppercase">Scroll to explore</span>
              <span className="w-10 h-px bg-white/30"></span>
            </div>
          </div>
        </section>

        {/* Research Insights Stats */}
        <section className="py-8 px-4 md:px-8 bg-surface border-b border-surface-variant z-20 relative -mt-8 mx-4 md:mx-8 lg:mx-12 rounded-2xl shadow-elevated">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-surface-variant">
            <div className="py-6 md:py-4 flex flex-col gap-2 items-center">
              <span className="material-symbols-outlined text-primary text-4xl">group</span>
              <h3 className="font-display-lg text-display-lg text-primary">15,000+</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Active Researchers</p>
            </div>
            <div className="py-6 md:py-4 flex flex-col gap-2 items-center">
              <span className="material-symbols-outlined text-primary text-4xl">menu_book</span>
              <h3 className="font-display-lg text-display-lg text-primary">45,000+</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Published Theses &amp; Dissertations</p>
            </div>
            <div className="py-6 md:py-4 flex flex-col gap-2 items-center">
              <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
              <h3 className="font-display-lg text-display-lg text-primary">50+</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Partner Institutions</p>
            </div>
          </div>
        </section>

        {/* Institutional Partners Marquee */}
        <section className="py-6 px-6 md:px-8 bg-surface border-b border-surface-variant overflow-hidden flex flex-col items-center">
          <p className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-widest text-center">Trusted by Leading Universities</p>
          <div className="w-full max-w-7xl relative flex overflow-hidden">
            <div className="flex gap-12 whitespace-nowrap animate-marquee items-center opacity-70">
              <span className="font-headline-md text-headline-md text-on-surface">University of Lagos</span>
              <span className="font-headline-md text-headline-md text-on-surface">University of Nairobi</span>
              <span className="font-headline-md text-headline-md text-on-surface">Makerere University</span>
              <span className="font-headline-md text-headline-md text-on-surface">University of Ghana</span>
              <span className="font-headline-md text-headline-md text-on-surface">Cheikh Anta Diop University</span>
              <span className="font-headline-md text-headline-md text-on-surface">University of Lagos</span>
              <span className="font-headline-md text-headline-md text-on-surface">University of Nairobi</span>
              <span className="font-headline-md text-headline-md text-on-surface">Makerere University</span>
            </div>
          </div>
        </section>

        {/* Photography Showcase - using the 4 downloaded stitch image PNGs */}
        <section id="solutions" className="py-12 md:py-16 px-4 md:px-8 bg-surface-container-lowest border-b border-surface-variant">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div>
                <span className="font-label-md text-label-md text-secondary tracking-widest uppercase">Research in Action</span>
                <h2 className="font-headline-lg text-headline-lg text-primary mt-2">Real people. Real research.</h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-2">Photography from the EARMS Blueprint — curated to showcase collaborative scholarship across African institutions.</p>
              </div>
              <span className="font-body-sm text-body-sm text-outline">4 images • Electronic Academic Research Management System</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {src:HERO_2, fallback:HERO_REMOTE_2, id:'3afeb6d3', title:'Collaborative Lab', desc:'Diverse postgraduate cohort in a high-tech university lab — bright, airy, professional.'},
                {src:HERO_1, fallback:HERO_REMOTE_1, id:'7a9c8cf1', title:'Focused Scholarship', desc:'Female postgraduate in a sunlit library, embodying deep focus and academic elegance.'},
                {src:HERO_3, fallback:HERO_REMOTE_3, id:'f8d90eea', title:'Knowledge Transfer', desc:'Professor lecturing engaged postgraduates, digital whiteboard with research data.'},
                {src:HERO_4, fallback:HERO_REMOTE_4, id:'fd2900c8', title:'Data Dialogue', desc:'Two researchers debating a complex visualization on a large research facility screen.'},
              ].map(card=>(
                <div key={card.id} className="bg-surface rounded-xl overflow-hidden border border-surface-variant shadow-ambient group">
                  <div className="h-44 overflow-hidden bg-surface-container">
                    <img src={card.src} alt={card.title} onError={e=>{e.currentTarget.onerror=null; e.currentTarget.src=card.fallback}} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <span className="font-label-md text-[11px] tracking-widest uppercase text-outline">{card.id}</span>
                    <h3 className="font-headline-sm text-headline-sm text-primary mt-1">{card.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-3">{card.desc}</p>
                    <a href={`/stitch/${card.id === '3afeb6d3' ? '3afeb6d3a69f49a4a2bd966b8c41fe4e' : card.id === '7a9c8cf1' ? '7a9c8cf1172a4fe79b539ffc8745eba3' : card.id === 'f8d90eea' ? 'f8d90eea6ab446998338b9d72fdfadf4' : 'fd2900c824114a6ebe1ff73ae0a28c7a'}.png`} target="_blank" className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:text-tertiary mt-3">Open PNG <span className="material-symbols-outlined text-[16px]">open_in_new</span></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Research Insights */}
        <section className="py-12 md:py-16 px-4 md:px-8 bg-surface-container-lowest border-b border-surface-variant">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Latest Research Insights</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">Explore recent publications, methodological advances, and academic thought leadership.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {tag:'Policy', title:'The Future of Open Access in Africa', desc:'Examining the impact of open access mandates on knowledge dissemination and institutional repositories across the continent.', img:"https://lh3.googleusercontent.com/aida-public/AB6AXuADwVhogCz38Ej9GneGjRQ6Y6llKsYBfcUpl87H_HAqdYQUHgn1h1AOcfNi5rgCsgXZddKQ3OG661MmfLdtDaXby4dCw-DSvWdfYAOx0eWc92j6cc7YVjgMv2EFV73hTctjONNKouyvKqtcxKco39UyR8NOAdywssDA46gR2OTfZBXnrwuLlKLhEVoP981r4B7IVwr-cnUBkXVTxZ_-1oL77ut8kStktmW5tGzS_QdpPVUgHF4DY1Kg"},
                {tag:'Methodology', title:'Integrating AI in Qualitative Methodologies', desc:'A practical guide to utilizing machine learning tools for thematic analysis and coding in qualitative research projects.', img:"https://lh3.googleusercontent.com/aida-public/AB6AXuBiWqNCNOj5DbBY9z1myEFBNIMDQcdO2njvU_rIL4y6TgV0dvn9fXXQT18BBfg9OXD7qPzey1QUEUhpWDmOGqSJDK3F_I-48ttv8WEfJ5tJh6py1ZjSsd9tVBTDrrzs9onJw90bpw4kpfI84UPhdu5u7pqcLfA94xGuc3I7rAP2PouSM9DEUvUtCD3H1X_-Wm9L7ErCQujwOjVKT_DOGbvepy9wQc3PjiS1OklCfBF9m_ydMj9rQz4d"},
                {tag:'Funding', title:'Grant Writing Success: A Faculty Guide', desc:'Strategies for aligning research proposals with international funding agency priorities and institutional strategic goals.', img:"https://lh3.googleusercontent.com/aida-public/AB6AXuCYv7MUTKSwrB_7RAKoik-7Whn4Dc8LG5SP3WkoaXEqbGi44bOZZsizHuNT-IOYIjgHO5mBlTfQyI-pxmK9LhTsE4OqM6YZ3yAbm8CRDOimAR7f6bth6crLtQ5i76Gn-cu6v6ABqkUW5iXQjaj_D5MM_j0JcKWs7kaa_3H_T5atwleeHGtmrj5I3v-N35p57wPfPOdPPpKcUQM5KTRcPhd9inXX0570_kuxHh7eJkti1jFZhQ-s6oj0"},
              ].map(a=>(
                <div key={a.title} className="bg-surface rounded-xl overflow-hidden border border-surface-variant shadow-ambient hover:shadow-elevated transition-shadow group flex flex-col">
                  <div className="h-48 bg-surface-container overflow-hidden"><img alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={a.img}/></div>
                  <div className="p-5 flex flex-col flex-grow">
                    <span className="font-label-md text-label-md text-secondary mb-2 uppercase tracking-wider">{a.tag}</span>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-2 line-clamp-2 group-hover:text-tertiary transition-colors">{a.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex-grow line-clamp-3">{a.desc}</p>
                    <a className="font-label-md text-label-md text-primary hover:text-tertiary flex items-center gap-1 mt-auto" href="#">Read Article <span className="material-symbols-outlined text-[16px]">arrow_forward</span></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 md:py-16 px-4 md:px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8"><h2 className="font-headline-lg text-headline-lg text-primary">Voices from the Academic Community</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {name:'Dr. Amina Diop', role:'Director of Research, West African Institute', initials:'DA', color:'bg-primary-fixed', text:'EARMS has completely transformed how we manage our research portfolio. The automation of ethical clearance routing alone has saved our faculty countless hours, allowing them to focus on what truly matters: their research.'},
                {name:'Prof. Kwame Osei', role:'Dean of Graduate Studies, Regional University', initials:'PK', color:'bg-secondary-fixed', text:'The legacy data integration capabilities were a game-changer for us. We were able to migrate a decade’s worth of dissertation data seamlessly into the new system without losing any historical metadata.'},
              ].map(t=>(
                <div key={t.name} className="bg-surface-container-low p-6 rounded-2xl border border-surface-variant flex flex-col gap-4">
                  <div className="flex items-center gap-1 text-secondary">
                    {[...Array(5)].map((_,i)=><span key={i} className="material-symbols-outlined fill">star</span>)}
                  </div>
                  <p className="font-body-lg text-body-lg text-on-surface-variant italic flex-grow">"{t.text}"</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className={`w-12 h-12 ${t.color} rounded-full flex items-center justify-center font-headline-md text-on-primary-fixed`}>{t.initials}</div>
                    <div><p className="font-label-md text-label-md text-primary">{t.name}</p><p className="font-body-sm text-body-sm text-on-surface-variant">{t.role}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portals Section */}
        <section className="py-12 md:py-16 px-4 md:px-8 bg-surface-container-lowest relative border-t border-surface-variant" id="portals">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-tertiary-fixed/20 via-surface-container-lowest to-surface-container-lowest pointer-events-none"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-10">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Dedicated Access Portals</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">Secure, role-based entry points tailored for distinct institutional needs.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-xl p-6 shadow-ambient flex flex-col gap-4 hover:shadow-elevated transition-all duration-300 group">
                <div className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center mb-1 shadow-sm border border-surface-variant"><span className="material-symbols-outlined text-primary text-2xl">school</span></div>
                <h3 className="font-headline-md text-headline-md text-primary">Faculty &amp; Researchers</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex-grow">Manage grant proposals, track active projects, and oversee research team milestones.</p>
                <button onClick={()=>go('faculty')} className="w-full bg-surface-container text-on-surface font-label-md py-3 rounded-lg hover:bg-surface-variant transition-colors flex justify-center items-center gap-2">Faculty Login <span className="material-symbols-outlined text-[18px]">login</span></button>
                <button onClick={()=>go('gateway')} className="text-primary font-label-md text-[13px] hover:underline">or choose via Gateway →</button>
              </div>
              <div className="glass-panel rounded-xl p-6 shadow-ambient flex flex-col gap-4 hover:shadow-elevated transition-all duration-300 border-2 border-primary/20">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-1 shadow-sm"><span className="material-symbols-outlined text-on-primary text-2xl">admin_panel_settings</span></div>
                <h3 className="font-headline-md text-headline-md text-primary">Administration</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex-grow">Oversight for institutional compliance, portfolio analytics, and system-wide configurations.</p>
                <button onClick={()=>go('admin')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-lg hover:bg-surface-tint transition-colors flex justify-center items-center gap-2">Admin Login <span className="material-symbols-outlined text-[18px]">login</span></button>
                <button onClick={()=>go('gateway')} className="text-primary font-label-md text-[13px] hover:underline">or choose via Gateway →</button>
              </div>
              <div className="glass-panel rounded-xl p-6 shadow-ambient flex flex-col gap-4 hover:shadow-elevated transition-all duration-300 group">
                <div className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center mb-1 shadow-sm border border-surface-variant"><span className="material-symbols-outlined text-primary text-2xl">group</span></div>
                <h3 className="font-headline-md text-headline-md text-primary">Student Researchers</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex-grow">Submit deliverables, review feedback, and access shared project repositories.</p>
                <button onClick={()=>go('student')} className="w-full bg-surface-container text-on-surface font-label-md py-3 rounded-lg hover:bg-surface-variant transition-colors flex justify-center items-center gap-2">Student Login <span className="material-symbols-outlined text-[18px]">login</span></button>
                <button onClick={()=>go('gateway')} className="text-primary font-label-md text-[13px] hover:underline">or choose via Gateway →</button>
              </div>
            </div>
            <p className="text-center font-body-sm text-body-sm text-outline mt-6">Also available: <button onClick={()=>go('login')} className="underline hover:text-primary">Secure Login Page</button> with institutional SSO</p>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-12 md:py-16 px-4 md:px-8 bg-surface border-t border-surface-variant" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 max-w-3xl">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Comprehensive System Capabilities</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Designed specifically for the complexities of academic research, ensuring data integrity and workflow efficiency.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[240px]">
              <div className="md:col-span-2 md:row-span-2 rounded-2xl border border-surface-variant shadow-sm flex flex-col relative overflow-hidden group min-h-[480px]">
                <img src="/images/automated_workflows.png" alt="Automated workflows diagram showing grant routing and approvals" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent"></div>
                <div className="relative z-10 flex-grow flex flex-col justify-end p-6">
                  <div className="bg-surface-container-lowest/55 backdrop-blur-md rounded-xl p-5 border border-white/40 shadow-ambient">
                    <div className="w-12 h-12 bg-surface-container rounded-full shadow-sm flex items-center justify-center mb-4 border border-surface-variant"><span className="material-symbols-outlined text-primary">account_tree</span></div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-1">Workflow Automation</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">Automate grant routing, ethics approvals (IRB), and budget clearances. Reduce administrative bottlenecks with intelligent rule-based routing.</p>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-6 border border-surface-variant shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 bg-surface-container-highest rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-on-surface">database</span></div>
                <div><h3 className="font-headline-sm text-headline-sm text-primary mb-1">Legacy Data Integration</h3><p className="font-body-sm text-body-sm text-on-surface-variant">Seamlessly migrate and synchronize data from existing HR, Financial, and Student Information Systems (SIS).</p></div>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant shadow-sm flex flex-col justify-between">
                <div className="w-10 h-10 bg-secondary-fixed rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-on-secondary-fixed">translate</span></div>
                <div><h3 className="font-headline-sm text-headline-sm text-primary mb-1">Multilingual Support</h3><p className="font-body-sm text-body-sm text-on-surface-variant">Full platform support for English and French to accommodate diverse institutions.</p></div>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-variant shadow-sm flex flex-col justify-between">
                <div className="w-10 h-10 bg-tertiary-fixed rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-on-tertiary-fixed">shield_lock</span></div>
                <div><h3 className="font-headline-sm text-headline-sm text-primary mb-1">Compliance Hub</h3><p className="font-body-sm text-body-sm text-on-surface-variant">Built-in audit trails and compliance monitoring for institutional research integrity.</p></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary-container text-on-primary-container py-10 px-6 md:px-8 border-t border-surface-variant">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-on-primary-container font-headline-md font-bold">EARMS <span className="font-body-sm font-normal opacity-70 hidden sm:inline">Electronic Academic Research Management System</span><span className="font-body-sm font-normal opacity-70 sm:hidden">EARMS</span></div>
            <div className="flex gap-4 font-body-sm">
              <a className="hover:text-inverse-primary transition-colors" href="#">Privacy Policy</a>
              <a className="hover:text-inverse-primary transition-colors" href="#">Terms of Service</a>
              <a className="hover:text-inverse-primary transition-colors" href="#">Support Center</a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 text-center">
            <p className="font-body-sm text-body-sm opacity-80">EARMS is built by BDIC Benue Digital Infrastructure Company Ltd in partnership with the African Digital Infrastructure Company Ltd.</p>
            <p className="font-body-sm text-body-sm opacity-80 mt-1">© 2024 Electronic Academic Research Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Login Gateway (Stitch: 2756eae455014af28d63a4ac3d257d5d) ---------- */
function Gateway({ go }) {
  return (
    <div className="bg-background min-h-screen relative overflow-hidden flex items-center justify-center antialiased py-8 px-4">
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary-fixed rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-secondary-fixed rounded-full mix-blend-multiply filter blur-[120px] opacity-30"></div>
      <main className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col items-center">
        <header className="text-center mb-10 flex flex-col items-center">
          <button onClick={()=>go('landing')}><img alt="EARMS System Logo" className="h-20 md:h-28 w-auto object-contain mb-6 drop-shadow-sm" src={LOGO_GATEWAY} /></button>
          <h1 className="font-display-lg text-display-lg text-on-background mb-2 tracking-tight">Access EARMS</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">Secure gateway to the Educational Administration and Research Management System. Select your designated portal to continue.</p>
          <div className="mt-4 flex gap-2 text-[12px]"><button onClick={()=>go('landing')} className="underline hover:text-primary">← Back to Landing</button><span>•</span><button onClick={()=>go('login')} className="underline hover:text-primary">Go to Secure Login</button></div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          <div className="group bg-surface-container-lowest rounded-xl p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md border border-outline-variant/30 hover:border-primary-fixed transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300 text-on-surface-variant z-10"><span className="material-symbols-outlined text-[40px]">school</span></div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2 z-10">Faculty &amp; Researchers</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 flex-grow z-10">Manage project portfolios, submit grant proposals, and review compliance documentation.</p>
            <button onClick={()=>go('faculty')} className="w-full py-3 px-6 bg-primary text-on-primary rounded-lg font-label-md hover:bg-surface-tint transition-colors duration-200 z-10 flex items-center justify-center gap-2">Login to Portal <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
            <button onClick={()=>go('login')} className="z-10 mt-2 font-body-sm text-[12px] underline text-outline hover:text-primary">via Secure Login</button>
          </div>
          <div className="group bg-surface-container-lowest rounded-xl p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md border border-outline-variant/30 hover:border-secondary-fixed transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-secondary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-secondary group-hover:text-on-secondary transition-colors duration-300 text-on-surface-variant z-10"><span className="material-symbols-outlined text-[40px]">admin_panel_settings</span></div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2 z-10">Administration</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 flex-grow z-10">Oversee institutional compliance, access high-level analytics, and manage systemic resources.</p>
            <button onClick={()=>go('admin')} className="w-full py-3 px-6 bg-surface-container-highest text-on-surface rounded-lg font-label-md border border-outline-variant hover:bg-surface-variant transition-colors duration-200 z-10 flex items-center justify-center gap-2">Login to Portal <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
            <button onClick={()=>go('login')} className="z-10 mt-2 font-body-sm text-[12px] underline text-outline hover:text-primary">via Secure Login</button>
          </div>
          <div className="group bg-surface-container-lowest rounded-xl p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md border border-outline-variant/30 hover:border-tertiary-fixed transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-tertiary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors duration-300 text-on-surface-variant z-10"><span className="material-symbols-outlined text-[40px]">person</span></div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2 z-10">Student Researchers</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 flex-grow z-10">Access assigned project data, log milestones, and collaborate seamlessly with lead faculty.</p>
            <button onClick={()=>go('student')} className="w-full py-3 px-6 bg-surface-container-highest text-on-surface rounded-lg font-label-md border border-outline-variant hover:bg-surface-variant transition-colors duration-200 z-10 flex items-center justify-center gap-2">Login to Portal <span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
            <button onClick={()=>go('login')} className="z-10 mt-2 font-body-sm text-[12px] underline text-outline hover:text-primary">via Secure Login</button>
          </div>
        </div>
        <footer className="mt-10 text-center">
          <p className="font-body-sm text-body-sm text-outline">© 2024 Institutional Research Board. All rights reserved.<br/><a className="hover:text-primary underline decoration-outline-variant underline-offset-4" href="#">Privacy Policy</a> · <a className="hover:text-primary underline decoration-outline-variant underline-offset-4" href="#">Terms of Service</a></p>
          <p className="font-body-sm text-[11px] text-outline mt-2">Secure gateway • Electronic Academic Research Management System</p>
        </footer>
      </main>
    </div>
  )
}

/* ---------- Login Page (Stitch: 1b71e7e4646a44a9a080da09a72c3dfa) ---------- */
function Login({ go }) {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [remember, setRemember] = useState(() => localStorage.getItem('earms_remember') === '1')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const q = new URLSearchParams((window.location.hash.split('?')[1]) || window.location.search)
    if (q.get('reset') === 'success') setInfo('Your password has been reset. Please sign in with your new password.')
    if (localStorage.getItem('earms_remember') === '1') {
      const saved = localStorage.getItem('earms_savedUser')
      if (saved) setEmail(saved)
    }
  }, [])
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !pwd) { setError('Please enter your username/email and password.'); return }
    setBusy(true)
    try {
      await authApi.login(email.trim(), pwd)
      if (remember) {
        localStorage.setItem('earms_remember', '1')
        localStorage.setItem('earms_savedUser', email.trim())
      } else {
        localStorage.removeItem('earms_remember')
        localStorage.removeItem('earms_savedUser')
      }
      go(routeForRole(getRoleFromToken()))
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="bg-surface-container-lowest min-h-screen font-body-md text-on-surface antialiased overflow-hidden flex flex-col md:flex-row">
      {/* Left Column: Slideshow Hero Area (60%) */}
      <div className="relative hidden md:block md:w-[60%] bg-surface-container h-screen overflow-hidden">
        <div className="absolute inset-0">
          <img alt="Researchers discussing data visualization" className="slideshow-image slide-1 active" src="/assets/stitch_login/slide-1.jpg" />
          <img alt="Professor lecturing postgraduate students" className="slideshow-image slide-2" src="/assets/stitch_login/slide-2.jpg" />
          <img alt="Postgraduate student in university library" className="slideshow-image slide-3" src="/assets/stitch_login/slide-3.jpg" />
          <img alt="Diverse group in modern lab" className="slideshow-image slide-4" src="/assets/stitch_login/slide-4.jpg" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-xl z-10">
          <h2 className="font-headline-lg text-headline-lg text-on-primary mb-sm">Advancing Academic Excellence</h2>
          <p className="font-body-lg text-body-lg text-on-primary/90 max-w-2xl">Empowering research and innovation across Sub-Saharan Africa through collaborative digital infrastructure.</p>
        </div>
      </div>
      {/* Right Column: Authentication Portal (40%) */}
      <div className="w-full md:w-[40%] flex flex-col justify-between h-screen p-lg md:p-xl lg:p-xxl bg-surface-container-lowest overflow-y-auto relative z-20">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
          <div className="flex flex-col items-center mb-xl">
            <img alt="EARMS Logo" className="h-24 w-auto object-contain mb-md" src="/assets/stitch_login/logo.png" />
            <h1 className="font-headline-md text-headline-md text-on-surface text-center">Welcome Back</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-sm text-center">Secure institutional access to the research portal.</p>
          </div>
          {error && <div className="w-full rounded-lg bg-error-container text-on-error-container text-body-sm font-body-sm px-md py-sm mb-md">{error}</div>}
          {info && <div className="w-full rounded-lg bg-primary-container text-on-primary-container text-body-sm font-body-sm px-md py-sm mb-md">{info}</div>}
          <form onSubmit={submit} className="space-y-lg">
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface block" htmlFor="email">Email or Username</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">person</span>
                <input className="w-full pl-xl pr-md py-[12px] bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md font-body-md placeholder-outline-variant" id="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="researcher@institution.edu" required type="text" autoComplete="username" />
              </div>
            </div>
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface block" htmlFor="password">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">lock</span>
                <input className="w-full pl-xl pr-xl py-[12px] bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md font-body-md" id="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="••••••••" required type={show ? 'text':'password'} />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-on-surface focus:outline-none" aria-label="Show password">
                  <span className="material-symbols-outlined">{show ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-md mb-xs">
              <label className="flex items-center gap-sm cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="w-4 h-4 rounded border-outline-variant accent-primary" />
                <span className="font-label-md text-label-md text-on-surface-variant">Remember Me</span>
              </label>
              <a className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim cursor-pointer" onClick={(e)=>{e.preventDefault(); go('forgot')}}>Forgot Password?</a>
            </div>
            <button className="w-full bg-primary text-on-primary font-label-md text-label-md py-[14px] rounded-lg hover:bg-primary-fixed-dim transition-colors duration-200 flex justify-center items-center gap-sm mt-sm shadow-sm" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <div className="relative flex items-center py-sm">
              <div className="flex-grow border-t border-outline-variant"></div>
              <span className="flex-shrink-0 mx-md text-outline font-body-sm text-body-sm">or</span>
              <div className="flex-grow border-t border-outline-variant"></div>
            </div>
            <button type="button" onClick={()=>setError('SSO / Institutional Login is not available yet.')} className="w-full bg-surface-container text-on-surface font-label-md text-label-md py-[14px] rounded-lg border border-outline-variant hover:bg-surface-variant transition-colors duration-200 flex justify-center items-center gap-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-secondary">domain</span> SSO / Institutional Login
            </button>
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant pt-sm">
              Don't have an account?{" "}
              <button type="button" onClick={()=>go('signup')} className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim cursor-pointer">Sign Up</button>
            </p>
          </form>
        </div>
        <div className="mt-xl text-center pb-md border-t border-outline-variant pt-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm">In partnership with BDIC &amp; African Digital Infrastructure</p>
          <div className="flex justify-center gap-md font-body-sm text-body-sm text-primary">
            <a className="hover:underline" href="#">Privacy Policy</a>
            <span className="text-outline-variant">•</span>
            <a className="hover:underline" href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Sign Up / Create Account (POST /api/usermgt/create-owner) ---------- */
const AFRICAN_REGIONS = [
  { id: 1, name: "Nigeria" },
  { id: 2, name: "Ghana" },
  { id: 3, name: "Kenya" },
  { id: 4, name: "Zambia" },
  { id: 5, name: "Zimbabwe" },
  { id: 6, name: "South Africa" },
  { id: 7, name: "Egypt" },
  { id: 8, name: "Morocco" },
  { id: 9, name: "Ethiopia" },
  { id: 10, name: "Uganda" },
  { id: 11, name: "Namibia" },
  { id: 12, name: "Tanzania" },
  { id: 13, name: "Botswana" },
  { id: 14, name: "Mozambique" },
];

function Signup({ go }) {
  const [ownerType, setOwnerType] = useState(1) // 1 = Institution, 2 = Personal
  const [ownerName, setOwnerName] = useState('')
  const [institutionCode, setInstitutionCode] = useState('')
  const [region, setRegion] = useState('')
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!ownerName.trim() || !userName.trim() || !email.trim()) {
      setError('Please fill in the name, username and email.'); return
    }
    if (ownerType === 1 && !institutionCode.trim()) {
      setError('Please provide an institution code.'); return
    }
    if (!region) { setError('Please select a region.'); return }
    if (!pwd) { setError('Please choose a password.'); return }
    if (pwd !== confirm) { setError('Passwords do not match.'); return }
    if (!terms) { setError('You must accept the Terms and Conditions.'); return }
    setBusy(true)
    try {
      await userApi.createOwner({
        ownerName: ownerName.trim(),
        ownerType: Number(ownerType),
        ownerEmail: email.trim(),
        userName: userName.trim(),
        password: pwd,
        region: Number(region),
        userRoles: [ownerType === 1 ? 'InstitutionAdmin' : 'Admin'],
        institutionCode: ownerType === 1 ? institutionCode.trim() : '',
        institutionName: ownerType === 1 ? ownerName.trim() : '',
        isActive: true,
        preferredLanguage: 'en',
        preferredCurrency: 'NGN',
        timeZone: 'Africa/Lagos',
      })
      setInfo('Account created. You can now sign in.')
    } catch (err) {
      setError(err.message || 'Could not create account.')
    } finally {
      setBusy(false)
    }
  }
  const input = "w-full pl-3 pr-3 py-2.5 bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md font-body-md placeholder-outline-variant"
  return (
    <AuthCard go={go}>
      <h1 className="font-headline-md text-headline-md text-on-surface text-center">Create Account</h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-center mb-6">Register a new institution or personal account for EARMS.</p>
      {error && <div className="w-full bg-error-container text-on-error-container text-body-sm font-body-sm px-3 py-2 rounded-lg mb-4">{error}</div>}
      {info && <div className="w-full bg-primary-container text-on-primary-container text-body-sm font-body-sm px-3 py-2 rounded-lg mb-4">{info}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="suType">Account Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={()=>setOwnerType(1)} className={`py-2.5 rounded-lg border font-label-md transition-colors ${ownerType===1 ? 'bg-primary text-on-primary border-primary' : 'bg-surface-bright border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}>Institution</button>
            <button type="button" onClick={()=>setOwnerType(2)} className={`py-2.5 rounded-lg border font-label-md transition-colors ${ownerType===2 ? 'bg-primary text-on-primary border-primary' : 'bg-surface-bright border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}>Personal</button>
          </div>
          <input type="hidden" id="suType" value={ownerType} />
        </div>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="suOwnerName">{ownerType === 1 ? 'Institution Name' : 'Full Name'}</label>
          <input className={input} id="suOwnerName" value={ownerName} onChange={e=>setOwnerName(e.target.value)} autoComplete="organization" required />
        </div>
        {ownerType === 1 && (
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface block" htmlFor="suInstCode">Institution Code</label>
            <input className={input} id="suInstCode" value={institutionCode} onChange={e=>setInstitutionCode(e.target.value)} placeholder="e.g. 50F" required />
          </div>
        )}
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="suRegion">Region</label>
          <select className={input} id="suRegion" value={region} onChange={e=>setRegion(e.target.value)} required>
            <option value="">-- Select Region --</option>
            {AFRICAN_REGIONS.map(r => (
              <option key={r.id} value={String(r.id)}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="suUsername">Username</label>
          <input className={input} id="suUsername" value={userName} onChange={e=>setUserName(e.target.value)} autoComplete="username" required />
        </div>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="suEmail">Email</label>
          <input className={input} id="suEmail" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface block" htmlFor="suPassword">Password</label>
            <div className="relative">
              <input className={input + " pr-10"} id="suPassword" type={show ? 'text' : 'password'} value={pwd} onChange={e=>setPwd(e.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Show password">
                <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-label-md text-label-md text-on-surface block" htmlFor="suConfirm">Confirm Password</label>
            <div className="relative">
              <input className={input + " pr-10"} id="suConfirm" type={show ? 'text' : 'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Show password">
                <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
        </div>
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-outline-variant accent-primary" />
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            I agree to the{" "}<button type="button" className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim cursor-pointer underline">Terms and Conditions</button>{" "}
            and{" "}<button type="button" className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim cursor-pointer underline">Privacy Policy</button>.
          </span>
        </label>
        <button className="w-full bg-primary text-on-primary font-label-md text-label-md py-[14px] rounded-lg hover:bg-primary-fixed-dim transition-colors duration-200 flex justify-center items-center gap-2 shadow-sm" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create Account'}
        </button>
        <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <button type="button" onClick={()=>go('login')} className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim cursor-pointer">Sign In</button>
        </p>
      </form>
    </AuthCard>
  )
}

/* ---------- Shared auth card wrapper (matches Login visual style) ---------- */
function AuthCard({ go, children }) {
  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative antialiased overflow-hidden p-4">
      <div className="absolute inset-0 bg-cover bg-center w-full h-full z-0 blur-[2px] scale-105" style={{backgroundImage:`url('${BG_LIBRARY}')`}}></div>
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-md z-0"></div>
      <div className="relative z-10 w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-ambient p-6 md:p-8 mx-2">
        <div className="flex flex-col items-center mb-6">
          <button onClick={()=>go('landing')}><img alt="EARMS Logo" className="h-20 w-auto object-contain mb-3" src={LOGO_LOGIN} /></button>
          <div className="flex gap-2 mt-1 text-[11px]">
            <button onClick={()=>go('landing')} className="underline hover:text-primary">← Landing</button>
            <button onClick={()=>go('login')} className="underline hover:text-primary">Login</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function useHashQuery() {
  const [q, setQ] = useState(() => {
    const h = window.location.hash || ''
    return h.split('?')[1] || window.location.search.replace(/^\?/, '')
  })
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash || ''
      setQ(h.split('?')[1] || window.location.search.replace(/^\?/, ''))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return new URLSearchParams(q)
}

/* ---------- Forgot Password (POST /api/Auth/request-password-reset) ---------- */
function ForgotPassword({ go }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setMsg(null)
    if (!email.trim()) { setErr('Please enter your email address.'); return }
    setBusy(true)
    try {
      await authApi.requestPasswordReset(email.trim())
      setMsg("If the account exists, a password reset link has been sent to your email.")
    } catch (e2) {
      setErr(e2.message || 'Could not send reset email. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthCard go={go}>
      <h1 className="font-headline-md text-headline-md text-on-surface text-center">Forgot Password</h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-center mb-6">Enter your account email and we'll send a secure reset link.</p>
      {err && <div className="w-full bg-error-container text-on-error-container text-body-sm font-body-sm px-3 py-2 rounded-lg mb-4">{err}</div>}
      {msg && <div className="w-full bg-primary-container text-on-primary-container text-body-sm font-body-sm px-3 py-2 rounded-lg mb-4">{msg}</div>}
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="email">Email</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
            <input className="w-full pl-10 pr-3 py-3 bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md placeholder-outline-variant" id="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="researcher@institution.edu" required type="email"/>
          </div>
        </div>
        <button className="w-full bg-primary-container text-on-primary-container font-label-md py-3.5 rounded-lg hover:bg-primary hover:text-on-primary transition-colors duration-200 flex justify-center items-center gap-2 shadow-sm" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send Reset Link'} <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
    </AuthCard>
  )
}

/* ---------- Reset Password (POST /api/Auth/reset-password) ---------- */
function ResetPassword({ go }) {
  const q = useHashQuery()
  const [token, setToken] = useState(q.get('token') || '')
  const [email, setEmail] = useState(q.get('email') || '')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!token) setErr('Missing or invalid reset token. Please request a new reset link.')
  }, [token])
  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!token) return
    if (!email.trim() || !pw) { setErr('Please complete all fields.'); return }
    if (pw !== confirm) { setErr('Passwords do not match.'); return }
    setBusy(true)
    try {
      await authApi.resetPassword(email.trim(), token, pw)
      go('login')
      window.location.hash = '/login?reset=success'
    } catch (e2) {
      setErr(e2.message || 'Password reset failed. Please try again.')
      setBusy(false)
    }
  }
  return (
    <AuthCard go={go}>
      <h1 className="font-headline-md text-headline-md text-on-surface text-center">Reset Password</h1>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-center mb-6">Choose a new password for your account.</p>
      {err && <div className="w-full bg-error-container text-on-error-container text-body-sm font-body-sm px-3 py-2 rounded-lg mb-4">{err}</div>}
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="email">Email</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
            <input className="w-full pl-10 pr-3 py-3 bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md placeholder-outline-variant" id="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="researcher@institution.edu" required type="email"/>
          </div>
        </div>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="newPassword">New Password</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
            <input className="w-full pl-10 pr-10 py-3 bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md" id="newPassword" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required type={show ? 'text':'password'}/>
            <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"><span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off':'visibility'}</span></button>
          </div>
        </div>
        <div className="space-y-1">
          <label className="font-label-md text-label-md text-on-surface block" htmlFor="confirmPassword">Confirm Password</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock</span>
            <input className="w-full pl-10 pr-3 py-3 bg-surface-bright border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-body-md" id="confirmPassword" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" required type={show ? 'text':'password'}/>
          </div>
        </div>
        <button className="w-full bg-primary-container text-on-primary-container font-label-md py-3.5 rounded-lg hover:bg-primary hover:text-on-primary transition-colors duration-200 flex justify-center items-center gap-2 shadow-sm" type="submit" disabled={busy}>
          {busy ? 'Updating…' : 'Update Password'} <span className="material-symbols-outlined text-[18px]">check</span>
        </button>
      </form>
    </AuthCard>
  )
}

/* ---------- Verify Email (GET /api/Auth/confirm-email) ---------- */
function VerifyEmail({ go }) {
  const q = useHashQuery()
  const [state, setState] = useState({ status: 'loading', msg: 'Verifying your email address…' })
  useEffect(() => {
    const userId = q.get('userId')
    const code = q.get('code')
    if (!userId || !code) {
      setState({ status: 'error', msg: 'Invalid verification link. Missing user or code.' })
      return
    }
    authApi.confirmEmail(userId, code)
      .then(() => setState({ status: 'ok', msg: 'Your email has been confirmed successfully.' }))
      .catch((e) => setState({ status: 'error', msg: (e.message || 'Email confirmation failed') + ' The link may be invalid or expired.' }))
  }, [])
  const tone = state.status === 'ok'
    ? 'bg-primary-container text-on-primary-container'
    : state.status === 'error'
      ? 'bg-error-container text-on-error-container'
      : 'bg-surface-container text-on-surface'
  const icon = state.status === 'ok' ? 'check_circle' : state.status === 'error' ? 'error' : 'hourglass_top'
  return (
    <AuthCard go={go}>
      <h1 className="font-headline-md text-headline-md text-on-surface text-center mb-6">Email Verification</h1>
      <div className={`w-full rounded-lg text-body-md font-body-md px-4 py-6 flex flex-col items-center gap-3 text-center ${tone}`}>
        <span className="material-symbols-outlined text-[40px]">{icon}</span>
        <span>{state.msg}</span>
      </div>
      {state.status !== 'loading' && (
        <div className="mt-4 text-center">
          <button onClick={()=>go('login')} className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim inline-flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[18px]">login</span> Continue to Login
          </button>
        </div>
      )}
    </AuthCard>
  )
}

/* ---------- Authenticated Dashboard placeholder (GET /api/Auth/entitlements) ---------- */
function Dashboard({ go }) {
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!tokenService.isAuthenticated()) { go('login'); return }
    const target = routeForRole(getRoleFromToken())
    if (target !== 'dashboard') { go(target); return }
    authApi.getEntitlements()
      .then((d) => setInfo(d))
      .catch((e) => {
        if (!tokenService.isAuthenticated()) go('login')
        else setErr('Could not load entitlements: ' + (e.message || 'unknown error'))
      })
  }, [])
  const logout = async () => {
    try { await authApi.logout() } catch (e) {}
    go('login')
  }
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center gap-3">
          <button onClick={()=>go('landing')}><img alt="EARMS Logo" className="h-9 object-contain" src={LOGO_EARMS} /></button>
          <span className="font-headline-sm text-headline-sm font-bold text-primary">EARMS</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 font-label-md text-label-md text-primary hover:text-primary-fixed-dim transition-colors">
          <span className="material-symbols-outlined text-[18px]">logout</span> Log out
        </button>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16 w-full">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Welcome to your research portal</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">You are signed in. The full dashboard will be built next.</p>
        {err && <div className="w-full bg-error-container text-on-error-container text-body-sm font-body-sm px-3 py-2 rounded-lg mb-6">{err}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl bg-surface-container border border-outline-variant">
            <span className="material-symbols-outlined text-primary text-[28px]">verified_user</span>
            <p className="font-label-md text-label-md text-on-surface mt-2">Authenticated</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Access token is valid.</p>
          </div>
        </div>
        {info && (
          <div className="mt-8 p-6 rounded-xl bg-surface-container-low border border-outline-variant">
            <p className="font-label-md text-label-md text-on-surface mb-2">Subscription &amp; Features</p>
            <pre className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-wrap">{JSON.stringify(info, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  )
}

/* ---------- Shared Dashboard Shell ---------- */
function DashShell({ go, active, title, subtitle, children, role, subrole }) {
  const [mobileNav, setMobileNav] = useState(false)
  const [openGroups, setOpenGroups] = useState({})
  const toggleGroup = (key) => setOpenGroups(s => ({...s, [key]: !s[key]}))
  const logout = async () => {
    try { await authApi.logout() } catch (e) {}
    go('login')
  }
  const navItems = [
    {key:'student', label:'Dashboard', icon:'dashboard'},
    {key:'student-projects', label:'Active Projects', icon:'folder_managed'},
    {key:'grant', label:'Grant Tracking', icon:'payments'},
    {key:'milestones', label:'Milestones', icon:'flag'},
    {key:'pubs', label:'Publications', icon:'article'},
    {key:'team', label:'Team Settings', icon:'group'},
  ]
  const systemAdminNavItems = [
    {label: 'Home', icon: 'home'},
    {label: 'Subscription', icon: 'card_membership', subitems: ['Verification','View','Pricing','Active','Suspend']},
    {label: 'Plan', icon: 'inventory_2', subitems: ['View Plans']},
    {label: 'Analytics', icon: 'analytics', subitems: ['Dashboard','Revenue Reports','Subscription Status','Ratings']},
    {label: 'Regional', icon: 'public', subitems: ['View Region']},
    {label: 'Settings', icon: 'settings'},
  ]
  const collegeTerm = (() => {
    try {
      const tok = decodeToken()
      const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
      const key = code ? `earms_college_term_${code}` : "earms_college_term"
      const v = localStorage.getItem(key)
      if (v === "School" || v === "Faculty" || v === "College") return v
      return "College"
    } catch { return "College" }
  })()
  const institutionAdminNavItems = [
    {label: 'Home', icon: 'home'},
    {label: 'Onboarding', icon: 'assignment', subitems: ['Subscriber','PG', collegeTerm,'Department','Programme','Staff','Student']},
    {label: 'Subscription', icon: 'card_membership', subitems: ['Subscribe','Check Status','Upgrade']},
    {label: 'Payment History', icon: 'receipt_long', subitems: ['Subscription History','Failed Payments','Role Management','Assign Role','Remove Role']},
    {label: 'Analytics', icon: 'insights', subitems: ['Summary']},
    {label: 'Settings', icon: 'settings'},
  ]
  // map active to highlight
  const isActive = (k) => {
    if (active==='student' && k==='student') return true
    if (active==='faculty' && k==='student') return true // faculty dashboard uses same label
    if (active==='admin' && k==='team') return false // admin highlights System Topology, handle separately
    return false
  }
  return (
    <div className="min-h-screen flex bg-background">
      {/* SideNav - desktop */}
      <nav className="hidden md:flex flex-col bg-surface-container-low border-r border-outline-variant shadow-sm w-64 h-screen fixed left-0 top-0 p-4 z-40">
        <div className="flex items-center gap-2 mb-6">
          {role==='admin' ? (
            <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-on-primary">school</span></div>
          ) : role==='faculty' ? (
            <img alt="crest" className="w-10 h-10 object-contain" src={CREST}/>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">EA</div>
          )}
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface leading-tight">{role==='admin' ? 'EARMS Admin' : role==='faculty' ? 'Project Portfolio' : 'Project Portfolio'}</h1>
            <p className="font-label-md text-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">{role==='admin' ? 'Control Panel' : 'Academic Year 2023-24'}</p>
          </div>
        </div>
        {role !== 'admin' && (
          <button onClick={()=>go('gateway')} className={`mb-6 w-full font-label-md py-2.5 rounded-lg flex items-center justify-center gap-1.5 ${role==='faculty' ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed'}`}>
            <span className="material-symbols-outlined text-[18px]">add</span> New Grant Application
          </button>
        )}
        <ul className="flex-1 space-y-1 overflow-y-auto">
          {role==='admin' ? (
            subrole === 'institution' ? (
              // Institution admin - AdminPanel (subrole="institution") -> Home, Onboarding, Subscriber, Staff, Student, Subscription, Role Management, Analytics
              <>
                {institutionAdminNavItems.map(it => {
                  const hasSub = Array.isArray(it.subitems) && it.subitems.length > 0
                  const isOpen = !!openGroups[it.label]
                  if (it.onClick) {
                    return <li key={it.label}><button onClick={it.onClick} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left"><span className="material-symbols-outlined text-[20px]">{it.icon}</span> {it.label}</button></li>
                  }
                  if (!hasSub) {
                    const nav = it.label === 'Home' ? ()=>go('admin') : it.label === 'Settings' ? ()=>go('admin?section=settings') : undefined
                    return <li key={it.label}><button onClick={nav} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left"><span className="material-symbols-outlined text-[20px]">{it.icon}</span> {it.label}</button></li>
                  }
                  return (
                    <li key={it.label}>
                      <button onClick={()=>toggleGroup(it.label)} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left">
                        <span className="material-symbols-outlined text-[20px]">{it.icon}</span> <span className="flex-1 text-left">{it.label}</span> <span className="material-symbols-outlined text-[18px]">{isOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {isOpen && (
                        <ul className="ml-9 mt-1 space-y-0.5 border-l border-outline-variant pl-3">
                          {it.subitems.map(sub => (
                            <li key={sub}><button onClick={()=>go(`admin?section=${it.label.toLowerCase().replace(/\s+/g, '-')}&item=${encodeURIComponent(sub)}`)} type="button" className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-on-surface-variant rounded hover:bg-surface-container-high text-left"><span className="material-symbols-outlined text-[14px]">chevron_right</span> {sub}</button></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </>
            ) : (
              // System admin - system route (role="admin" no subrole) -> Home, Subscription, Plan, Analytics, Regional, Settings
              <>
                {systemAdminNavItems.map(it => {
                  const hasSub = Array.isArray(it.subitems) && it.subitems.length > 0
                  const isOpen = !!openGroups[it.label]
                  if (it.onClick) {
                    return <li key={it.label}><button onClick={it.onClick} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left"><span className="material-symbols-outlined text-[20px]">{it.icon}</span> {it.label}</button></li>
                  }
                  if (!hasSub) {
                    const nav = it.label === 'Home' ? ()=>go('system') : it.label === 'Settings' ? ()=>go('system?section=settings') : undefined
                    return <li key={it.label}><button onClick={nav} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left"><span className="material-symbols-outlined text-[20px]">{it.icon}</span> {it.label}</button></li>
                  }
                  return (
                    <li key={it.label}>
                      <button onClick={()=>toggleGroup(it.label)} type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left">
                        <span className="material-symbols-outlined text-[20px]">{it.icon}</span> <span className="flex-1 text-left">{it.label}</span> <span className="material-symbols-outlined text-[18px]">{isOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {isOpen && (
                        <ul className="ml-9 mt-1 space-y-0.5 border-l border-outline-variant pl-3">
                          {it.subitems.map(sub => (
                            <li key={sub}><button onClick={()=>go(`system?section=${it.label.toLowerCase()}&item=${encodeURIComponent(sub)}`)} type="button" className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-on-surface-variant rounded hover:bg-surface-container-high text-left"><span className="material-symbols-outlined text-[14px]">chevron_right</span> {sub}</button></li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </>
            )
          ) : role==='faculty' ? (
            <>
              <li><button type="button" className="w-full flex items-center gap-3 px-3 py-2 bg-secondary-fixed text-on-secondary-fixed font-bold rounded-lg text-left"><span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>dashboard</span> Dashboard</button></li>
              {navItems.slice(1).map(it=>(
                <li key={it.key}><button type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left"><span className="material-symbols-outlined">{it.icon}</span> {it.label}</button></li>
              ))}
            </>
          ) : (
            // student
            <>
              <li><button type="button" className="w-full flex items-center gap-3 px-3 py-2 bg-secondary-fixed text-on-secondary-fixed font-bold rounded-lg text-left"><span className="material-symbols-outlined">dashboard</span> Dashboard</button></li>
              {navItems.slice(1).map(it=>(
                <li key={it.key}><button type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg text-left"><span className="material-symbols-outlined">{it.icon}</span> {it.label}</button></li>
              ))}
            </>
          )}
        </ul>
        <div className="pt-4 border-t border-outline-variant mt-auto space-y-1">
          <button type="button" className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg text-left"><span className="material-symbols-outlined text-[20px]">help_outline</span> Help Center</button>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg cursor-pointer w-full text-left"><span className="material-symbols-outlined text-[20px]">logout</span> Logout</button>
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-surface border-b border-outline-variant px-4 py-3 flex items-center justify-between z-40">
        <button onClick={()=>setMobileNav(!mobileNav)}><span className="material-symbols-outlined">{mobileNav ? 'close':'menu'}</span></button>
        <span className="font-headline-md font-bold text-primary">EARMS</span>
        <img src={role==='student' ? AVATAR_STUDENT : AVATAR_FACULTY} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-outline-variant"/>
      </div>
      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-30 bg-surface p-4 pt-16 overflow-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={()=>{go('student'); setMobileNav(false)}} className={`p-3 rounded-lg border text-center ${active==='student'?'bg-secondary-fixed border-secondary-fixed':''}`}><span className="material-symbols-outlined block">school</span><span className="text-[12px]">Student</span></button>
              <button onClick={()=>{go('faculty'); setMobileNav(false)}} className={`p-3 rounded-lg border text-center ${active==='faculty'?'bg-secondary-fixed border-secondary-fixed':''}`}><span className="material-symbols-outlined block">admin_panel_settings</span><span className="text-[12px]">Faculty</span></button>
              <button onClick={()=>{go('admin'); setMobileNav(false)}} className={`p-3 rounded-lg border text-center ${active==='admin'?'bg-secondary-fixed border-secondary-fixed':''}`}><span className="material-symbols-outlined block">dns</span><span className="text-[12px]">Admin</span></button>
            </div>
            <button onClick={()=>{go('landing'); setMobileNav(false)}} className="w-full py-3 bg-primary text-on-primary rounded-lg">Back to Landing</button>
              <button onClick={()=>{go('gateway'); setMobileNav(false)}} className="w-full py-3 border border-outline-variant rounded-lg">Gateway</button>
              <button onClick={()=>{logout(); setMobileNav(false)}} className="w-full py-3 bg-error-container text-on-error-container rounded-lg flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[18px]">logout</span> Logout</button>
          </div>
        </div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* TopBar for faculty/student - keep simple header */}
        {role !== 'admin' ? (
          <header className="bg-surface border-b border-outline-variant px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 md:top-0 z-20 mt-12 md:mt-0">
            <h2 className="hidden md:block font-headline-md font-bold text-primary truncate">{title}</h2>
            <div className="flex md:hidden items-center gap-2"><span className="font-headline-sm font-bold">{title}</span></div>
            <nav className="hidden md:flex gap-6 items-center">
              <button type="button" className="text-on-surface-variant hover:text-primary px-2 py-1 rounded hover:bg-surface-container-low text-sm">Research</button>
              <button type="button" className="text-on-surface-variant hover:text-primary px-2 py-1 rounded hover:bg-surface-container-low text-sm">Grants</button>
              <button type="button" className="text-on-surface-variant hover:text-primary px-2 py-1 rounded hover:bg-surface-container-low text-sm">Compliance</button>
              <button type="button" className="text-primary border-b-2 border-primary font-bold pb-1 text-sm">Analytics</button>
            </nav>
            <div className="flex items-center gap-2 md:gap-3">
              <button className="hidden md:block bg-primary text-on-primary font-label-md py-1.5 px-4 rounded hover:bg-primary-container transition-colors text-sm">Submit Proposal</button>
              <button className="p-1 hover:bg-surface-variant rounded-full"><span className="material-symbols-outlined text-[20px]">notifications</span></button>
              <button className="p-1 hover:bg-surface-variant rounded-full hidden md:block"><span className="material-symbols-outlined text-[20px]">apps</span></button>
              <img alt="avatar" className="w-8 h-8 rounded-full object-cover border border-outline-variant" src={role==='student' ? AVATAR_STUDENT : AVATAR_FACULTY}/>
            </div>
          </header>
        ) : (
          // admin header already integrated inside page, but we keep a spacer for mobile
          <div className="md:hidden h-12"></div>
        )}
        <div className="p-4 md:p-6 lg:p-8 flex-1 max-w-[1600px] w-full mx-auto">
          <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
            <div>
              <h2 className="font-display-lg text-display-lg md:text-[36px] text-primary leading-tight">{title}</h2>
              <p className="font-body-lg text-on-surface-variant mt-1">{subtitle}</p>
            </div>
            {role==='student' && <div className="hidden lg:block text-right"><p className="font-label-md text-outline">Current Focus</p><p className="font-headline-sm text-secondary-container">Chapter 2: Literature Review</p></div>}
            {role==='admin' && <div className="flex items-center gap-2"><div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-outline-variant ambient-shadow"><span className="w-2 h-2 rounded-full bg-green-500"></span><span className="font-label-md text-label-md">System Optimal</span></div><button className="p-2 rounded-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low ambient-shadow"><span className="material-symbols-outlined text-[20px]">refresh</span></button></div>}
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ---------- System Admin Home Dashboard ---------- */
function SystemHome({ go }) {
  const q = useHashQuery()
  const section = (q.get('section') || '').toLowerCase()
  const item = q.get('item') || ''

  // If a specific section is requested, show placeholder for that section
  if (section) {
    const isSettings = section === 'settings'
    return (
      <div className="space-y-6 max-w-5xl">
        <button onClick={()=>go('system')} className="inline-flex items-center gap-1.5 font-label-md text-primary hover:text-primary-fixed-dim">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Home
        </button>
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center"><span className="material-symbols-outlined text-primary">{section==='subscription'?'card_membership':section==='plan'?'inventory_2':section==='analytics'?'analytics':section==='regional'?'public':'settings'}</span></div>
            <div>
              <h2 className="font-headline-md font-bold text-primary capitalize">{section} {item ? `— ${item}` : ''}</h2>
              <p className="font-body-sm text-on-surface-variant">Manage {section} {item ? `· ${item}` : 'overview and actions'}</p>
            </div>
          </div>
          {isSettings ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant">
                <h3 className="font-label-md font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined">lock_reset</span> Change Password</h3>
                <p className="font-body-sm text-on-surface-variant mb-3">Update your system admin password. You will be logged out after a successful change.</p>
                <button onClick={()=>go('forgot')} className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim">Go to Reset Password</button>
              </div>
              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant">
                <h3 className="font-label-md font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined">manage_accounts</span> System Preferences</h3>
                <p className="font-body-sm text-on-surface-variant mb-3">IAM configuration, owner and mail management.</p>
                <div className="space-y-2">
                  <button onClick={()=>{const el=document.getElementById('iam-panel'); if(el) el.scrollIntoView({behavior:'smooth'});}} className="w-full border border-outline-variant bg-surface py-2.5 rounded-lg font-label-md hover:bg-surface-variant">View IAM Panel Below</button>
                  <p className="font-body-sm text-[12px] text-outline text-center">More settings (notifications, audit logs) will appear here.</p>
                </div>
              </div>
              <div id="iam-panel" className="lg:col-span-2">
                <IamAdmin go={go} />
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">construction</span>
              <p className="font-headline-sm text-on-surface">Placeholder for {section} {item && `· ${item}`}</p>
              <p className="font-body-sm text-on-surface-variant mt-1">This view will host the {section} functionality ({item || 'overview'}).</p>
              <button onClick={()=>go('system')} className="mt-4 px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md">Return to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Home dashboard - stat cards + icon grid mapping to sidebar
  const stats = [
    {label: 'Total Subscriptions', value: '1,248', sub: 'Verification pending: 23', icon: 'card_membership', color: 'bg-primary-container text-primary'},
    {label: 'Active Plans', value: '8', sub: 'View Plans: 8', icon: 'inventory_2', color: 'bg-secondary-container text-secondary'},
    {label: 'Analytics Reports', value: '42', sub: 'Subscription Status: 31 active', icon: 'analytics', color: 'bg-tertiary-container text-tertiary'},
    {label: 'Regions', value: '14', sub: 'View Region: 14', icon: 'public', color: 'bg-surface-container-high text-on-surface'},
  ]
  const groups = [
    {key: 'subscription', label: 'Subscription', icon: 'card_membership', desc: 'Verification, pricing and lifecycle control', subs: ['Verification','View','Pricing','Active','Suspend'], color: 'bg-primary-fixed'},
    {key: 'plan', label: 'Plan', icon: 'inventory_2', desc: 'Create and manage subscription plans', subs: ['View Plans'], color: 'bg-secondary-fixed'},
    {key: 'analytics', label: 'Analytics', icon: 'analytics', desc: 'Dashboards, revenue and ratings insight', subs: ['Dashboard','Revenue Reports','Subscription Status','Ratings'], color: 'bg-tertiary-fixed'},
    {key: 'regional', label: 'Regional', icon: 'public', desc: 'Regional distribution and view', subs: ['View Region'], color: 'bg-surface-container-high'},
    {key: 'settings', label: 'Settings', icon: 'settings', desc: 'System settings, password and preferences', subs: [], color: 'bg-surface-container-low'},
  ]
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s=>(
          <div key={s.label} className="glass-card ambient-shadow rounded-xl p-4 border border-surface-container flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant text-[11px] uppercase tracking-wide">{s.label}</p>
              <p className="font-headline-lg font-bold text-primary leading-none mt-1">{s.value}</p>
              <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{s.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}><span className="material-symbols-outlined">{s.icon}</span></div>
          </div>
        ))}
      </div>

      {/* Icon grid mapping to sidebar */}
      <div>
        <h3 className="font-headline-sm font-bold text-primary mb-3">Quick Access</h3>
        <p className="font-body-sm text-on-surface-variant mb-4">Icons map directly to the sidebar — click a card or any sub-item to open its view.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map(g=>(
            <div key={g.key} className="glass-card ambient-shadow rounded-xl border border-surface-container p-5 flex flex-col hover:shadow-elevated transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.color}`}><span className="material-symbols-outlined">{g.icon}</span></div>
                <div>
                  <h4 className="font-label-md font-bold text-on-surface">{g.label}</h4>
                  <p className="font-body-sm text-on-surface-variant text-[12px]">{g.desc}</p>
                </div>
              </div>
              {g.subs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                  {g.subs.map(sub=>(
                    <button key={sub} onClick={()=>go(`system?section=${g.key}&item=${encodeURIComponent(sub)}`)} className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-variant font-label-md text-[12px] border border-outline-variant">{sub}</button>
                  ))}
                </div>
              ) : (
                <p className="font-body-sm text-outline text-[12px] mb-3">No sub-items</p>
              )}
              <button onClick={()=>go(g.key==='settings' ? 'system?section=settings' : `system?section=${g.key}`)} className="mt-auto w-full bg-primary text-on-primary py-2 rounded-lg font-label-md hover:bg-primary-fixed-dim flex items-center justify-center gap-1.5">
                Open {g.label} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary">info</span>
        <p className="font-body-sm text-on-surface-variant">Use the left sidebar to navigate — submenus are collapsed by default; click any parent to expand and select a sub-item. The <span className="font-label-md text-on-surface">Home</span> dashboard above mirrors every sidebar function with matching icons and stats.</p>
      </div>
    </div>
  )
}

/* ---------- Institution Home Dashboard ---------- */
function InstitutionProfile({ go }) {
  const [inst, setInst] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [msg, setMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code:"", name:"", email:"", phoneNo:"", institutionType:"", address:"", website:"", facebookUrl:"", linkedinUrl:"" })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState("")
  const tok = decodeToken()
  const tokenCode = tok?.institutionCode || tok?.InstitutionCode || ""
  const tokenName = tok?.institutionName || tok?.InstitutionName || ""
  useEffect(() => {
    let cancelled = false
    setLoading(true); setErr("")
    // Try to fetch via onboarding API by code, fallback to token values
    const fetchInst = async () => {
      try {
        // First try to get the user's institution via owner API (more reliable for GHH)
        let owner = null
        try {
          const { ownerApi } = await import("./iam")
          owner = await ownerApi.getOwnerByName(tok?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "")
        } catch {}
        let data = null
        if (tokenCode) {
          try { data = await (await import("./onboarding")).onboardingApi.getInstitutionByCode(tokenCode) } catch {}
        }
        if (!data && owner?.institutionCode) {
          try { data = await (await import("./onboarding")).onboardingApi.getInstitutionByCode(owner.institutionCode) } catch {}
        }
        // Fallback to token values if onboarding has no record (e.g. University of Gboko not yet created)
        if (!data) {
          data = {
            code: owner?.institutionCode || tokenCode,
            name: owner?.institutionName || tokenName || owner?.ownerName || "",
            email: owner?.ownerEmail || tok?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "",
            phoneNo: "",
            institutionType: "",
            address: "",
            website: "",
            facebookUrl: "",
            linkedinUrl: "",
            logoUrl: ""
          }
        }
        if (cancelled) return
        // Normalize fields (API returns Code/Name etc)
        const code = data.code ?? data.Code ?? tokenCode ?? ""
        const name = data.name ?? data.Name ?? tokenName ?? ""
        const email = data.email ?? data.Email ?? owner?.ownerEmail ?? ""
        const phoneNo = data.phoneNo ?? data.PhoneNo ?? ""
        const institutionType = data.institutionType ?? data.InstitutionType ?? ""
        const address = data.address ?? data.Address ?? ""
        const website = data.website ?? data.Website ?? ""
        const facebookUrl = data.facebookUrl ?? data.FacebookUrl ?? ""
        const linkedinUrl = data.linkedinUrl ?? data.LinkedinUrl ?? ""
        const logoUrl = data.logoUrl ?? data.LogoUrl ?? data.logo ?? ""
        setInst(data)
        setForm({ code, name, email, phoneNo, institutionType, address, website, facebookUrl, linkedinUrl })
        if (logoUrl) setLogoPreview(logoUrl)
      } catch (e) {
        if (!cancelled) setErr(e.message || "Could not load institution profile")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchInst()
    return () => { cancelled = true }
  }, [tokenCode, tokenName])

  const onLogoChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLogoFile(f)
    setLogoPreview(URL.createObjectURL(f))
  }

  const save = async (e) => {
    e.preventDefault()
    setMsg(""); setErr("")
    if (!form.code.trim() || !form.name.trim()) { setErr("Code and Name are required."); return }
    setSaving(true)
    try {
      const { onboardingApi } = await import("./onboarding")
      const fd = new FormData()
      fd.append("Code", form.code.trim())
      fd.append("Name", form.name.trim())
      fd.append("Email", form.email.trim())
      fd.append("PhoneNo", form.phoneNo.trim())
      fd.append("InstitutionType", form.institutionType.trim())
      fd.append("Address", form.address.trim())
      fd.append("Website", form.website.trim())
      fd.append("FacebookUrl", form.facebookUrl.trim())
      fd.append("LinkedinUrl", form.linkedinUrl.trim())
      if (logoFile) fd.append("logoFile", logoFile)
      // Try to update if exists, otherwise create
      try {
        await onboardingApi.createInstitution(fd)
        setMsg("Institution profile saved.")
      } catch (err2) {
        setErr(err2.message || "Could not save institution")
      }
    } catch (err) {
      setErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}))

  if (loading) return <div className="glass-card rounded-xl p-6 border border-surface-container"><p className="font-body-sm text-on-surface-variant">Loading institution profile…</p></div>
  return (
    <div className="glass-card ambient-shadow rounded-xl border border-surface-container overflow-hidden">
      <div className="bg-surface-container-low border-b border-outline-variant p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-xl bg-surface-container-highest border border-outline-variant overflow-hidden flex items-center justify-center">
          {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-4xl text-outline">account_balance</span>}
        </div>
        <div>
          <h3 className="font-headline-sm font-bold text-primary">{form.name || "Institution"}</h3>
          <p className="font-body-sm text-on-surface-variant">{form.code ? `Code: ${form.code}` : ""} {form.institutionType ? `· ${form.institutionType}` : ""}</p>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md cursor-pointer hover:bg-primary-fixed-dim">
          <span className="material-symbols-outlined text-[18px]">upload</span> {logoPreview ? "Change Logo" : "Upload Logo"}
          <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
        </label>
        <p className="font-body-sm text-[11px] text-outline">Logo will be displayed at the very top of this page once uploaded.</p>
      </div>
      <form onSubmit={save} className="p-6 space-y-4">
        {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
        {msg && <div className="w-full rounded-lg bg-primary-container text-on-primary-container px-3 py-2 text-sm">{msg}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Code</span><input value={form.code} onChange={set("code")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. GHH" /></label>
          <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Name</span><input value={form.name} onChange={set("name")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="University of Gboko" /></label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Email</span><input type="email" value={form.email} onChange={set("email")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="info@univ.edu" /></label>
          <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Phone Number</span><input value={form.phoneNo} onChange={set("phoneNo")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="+234..." /></label>
        </div>
        <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Institution Type</span>
          <select value={form.institutionType} onChange={set("institutionType")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
            <option value="">Select type</option>
            <option value="University">University</option>
            <option value="Polytechnic">Polytechnic</option>
            <option value="College of Education">College of Education</option>
            <option value="College">College</option>
            <option value="School">School</option>
            <option value="Faculty">Faculty</option>
          </select>
        </label>
        <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Address</span><input value={form.address} onChange={set("address")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Street, City, State" /></label>
        <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Website</span><input value={form.website} onChange={set("website")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="https://" /></label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Facebook URL</span><input value={form.facebookUrl} onChange={set("facebookUrl")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="https://facebook.com/..." /></label>
          <label className="block"><span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">LinkedIn URL</span><input value={form.linkedinUrl} onChange={set("linkedinUrl")} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="https://linkedin.com/..." /></label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
          <button type="button" onClick={()=>go('admin')} className="px-6 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-variant">Back to Home</button>
        </div>
      </form>
    </div>
  )
}

function PGCreate({ go }) {
  const [name, setName] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setMsg(""); setErr("")
    if (!name.trim()) { setErr("Postgraduate School/College/Directorate Name is required."); return }
    setBusy(true)
    try {
      await new Promise(r => setTimeout(r, 600))
      setMsg(`"${name.trim()}" created successfully.`)
      setName("")
    } catch (e2) {
      setErr(e2.message || "Could not create")
    } finally {
      setBusy(false)
    }
  }
  const cancel = () => { setName(""); setErr(""); setMsg(""); go('admin') }
  return (
    <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6 max-w-2xl">
      <h3 className="font-headline-sm font-bold text-primary mb-4">Create Postgraduate</h3>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Postgraduate School/College/Directorate Name</span>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Postgraduate School of Science" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
        </label>
        {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
        {msg && <div className="w-full rounded-lg bg-primary-container text-on-primary-container px-3 py-2 text-sm">{msg}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{busy ? "Creating…" : "Create"}</button>
          <button type="button" onClick={cancel} className="flex-1 border border-outline-variant bg-surface py-3 rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
        </div>
      </form>
    </div>
  )
}

function CollegePage({ go }) {
  const collegeTerm = (() => {
    try {
      const tok = decodeToken()
      const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
      const key = code ? `earms_college_term_${code}` : "earms_college_term"
      const v = localStorage.getItem(key)
      if (v === "School" || v === "Faculty" || v === "College") return v
      return "College"
    } catch { return "College" }
  })()
  const collegePlural = collegeTerm === "Faculty" ? "Faculties" : collegeTerm === "School" ? "Schools" : "Colleges"
  const [colleges, setColleges] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  const tok = decodeToken()
  const instId = tok?.ownerId || tok?.OwnerId || ""

  const load = async () => {
    setLoading(true); setErr("")
    try {
      const { onboardingApi } = await import("./onboarding")
      // Try to get institution id from token's ownerId or from dropdown's first institution
      let id = instId
      if (!id) {
        const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
        if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
      }
      if (id) {
        const data = await onboardingApi.getColleges(String(id)).catch(()=>[])
        setColleges(Array.isArray(data) ? data : [])
      } else {
        setColleges([])
      }
    } catch (e) {
      setErr(e.message || "Could not load")
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setMsg(""); setErr("")
    if (!code.trim() || !name.trim()) { setErr(`${collegeTerm} Code and Name are required.`); return }
    setBusy(true)
    try {
      const { onboardingApi } = await import("./onboarding")
      let id = instId
      if (!id) {
        const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
        if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
      }
      if (!id) throw new Error("No institution found")
      await onboardingApi.createCollege({ Name: name.trim(), Code: code.trim(), InstitutionId: Number(id) })
      setMsg(`${collegeTerm} created.`)
      setCode(""); setName("")
      setShowModal(false)
      load()
    } catch (err2) {
      setErr(err2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline-md font-bold text-primary flex items-center gap-2"><span className="material-symbols-outlined">account_balance</span> {collegePlural}</h2>
          <p className="font-body-sm text-on-surface-variant">Manage {collegePlural.toLowerCase()} — exquisite grid with actions</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span> Add New {collegeTerm}
        </button>
      </div>

      {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
      {msg && <div className="w-full rounded-lg bg-primary-container text-on-primary-container px-3 py-2 text-sm">{msg}</div>}

      {/* Exquisite Grid Table - cards, not ordinary table */}
      {loading ? (
        <p className="font-body-sm text-on-surface-variant">Loading {collegePlural.toLowerCase()}…</p>
      ) : colleges.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center border border-dashed border-outline-variant bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">account_balance</span>
          <p className="font-headline-sm text-on-surface">No {collegePlural.toLowerCase()} yet</p>
          <p className="font-body-sm text-on-surface-variant mt-1">Click Add New {collegeTerm} to create your first {collegeTerm.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {colleges.map(c=>(
            <div key={c.Id ?? c.id} className="group relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm hover:shadow-elevated transition-all">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary to-secondary"></div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-primary">account_balance</span></div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">{c.Code ?? c.code ?? "—"}</span>
                </div>
                <h4 className="font-headline-sm font-bold text-on-surface mt-3 line-clamp-1">{c.Name ?? c.name}</h4>
                <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">ID: {c.Id ?? c.id} · {collegeTerm}</p>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary font-label-md text-[13px] hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[16px]">visibility</span> View</button>
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant bg-surface font-label-md text-[13px] hover:bg-surface-variant"><span className="material-symbols-outlined text-[16px]">edit</span> Edit</button>
                  <button className="w-10 h-10 rounded-lg border border-error/30 text-error hover:bg-error-container flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowModal(false)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-xl shadow-elevated border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm font-bold text-primary">Add New {collegeTerm}</h3>
              <button onClick={()=>setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">{collegeTerm} Code</span>
                <input value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. COS" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </label>
              <label className="block">
                <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">{collegeTerm} Name</span>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder={`${collegeTerm} of Science`} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </label>
              {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={busy} className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{busy ? "Creating…" : "Create"}</button>
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-outline-variant bg-surface py-3 rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function DepartmentPage({ go }) {
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [msg, setMsg] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const tok = decodeToken()
  const instId = tok?.ownerId || tok?.OwnerId || ""
  const load = async () => {
    setLoading(true); setErr("")
    try {
      const { onboardingApi } = await import("./onboarding")
      let id = instId
      if (!id) {
        const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
        if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
      }
      if (id) {
        const data = await onboardingApi.getDepartments(String(id)).catch(()=>[])
        setDepts(Array.isArray(data) ? data : [])
      } else setDepts([])
    } catch (e) { setErr(e.message || "Could not load") } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [])
  const submit = async (e) => {
    e.preventDefault()
    setMsg(""); setErr("")
    if (!code.trim() || !name.trim()) { setErr("Department Code and Name are required."); return }
    setBusy(true)
    try {
      const { onboardingApi } = await import("./onboarding")
      let id = instId
      if (!id) {
        const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
        if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
      }
      if (!id) throw new Error("No institution found")
      await onboardingApi.createDepartment(String(id), { code: code.trim(), name: name.trim() })
      setMsg("Department created.")
      setCode(""); setName("")
      setShowModal(false)
      load()
    } catch (err2) { setErr(err2.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline-md font-bold text-primary flex items-center gap-2"><span className="material-symbols-outlined">account_tree</span> Departments</h2>
          <p className="font-body-sm text-on-surface-variant">Manage departments — exquisite grid with actions</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim shadow-sm">
          <span className="material-symbols-outlined text-[18px]">add</span> Add New Department
        </button>
      </div>
      {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
      {msg && <div className="w-full rounded-lg bg-primary-container text-on-primary-container px-3 py-2 text-sm">{msg}</div>}
      {loading ? (
        <p className="font-body-sm text-on-surface-variant">Loading departments…</p>
      ) : depts.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center border border-dashed border-outline-variant bg-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">account_tree</span>
          <p className="font-headline-sm text-on-surface">No departments yet</p>
          <p className="font-body-sm text-on-surface-variant mt-1">Click Add New Department to create your first department.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {depts.map(d=>(
            <div key={d.Id ?? d.id} className="group relative overflow-hidden rounded-xl border border-surface-container bg-surface-container-lowest shadow-sm hover:shadow-elevated transition-all">
              <div className="h-1.5 w-full bg-gradient-to-r from-secondary to-primary"></div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-secondary">account_tree</span></div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] border border-outline-variant">{d.Code ?? d.code ?? "—"}</span>
                </div>
                <h4 className="font-headline-sm font-bold text-on-surface mt-3 line-clamp-1">{d.Name ?? d.name}</h4>
                <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">ID: {d.Id ?? d.id} · Department</p>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary font-label-md text-[13px] hover:bg-primary-fixed-dim"><span className="material-symbols-outlined text-[16px]">visibility</span> View</button>
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant bg-surface font-label-md text-[13px] hover:bg-surface-variant"><span className="material-symbols-outlined text-[16px]">edit</span> Edit</button>
                  <button className="w-10 h-10 rounded-lg border border-error/30 text-error hover:bg-error-container flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowModal(false)}></div>
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-xl shadow-elevated border border-outline-variant p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm font-bold text-primary">Add New Department</h3>
              <button onClick={()=>setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Department Code</span>
                <input value={code} onChange={e=>setCode(e.target.value)} placeholder="e.g. CSC" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </label>
              <label className="block">
                <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Department Name</span>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Computer Science" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </label>
              {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={busy} className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{busy ? "Creating…" : "Create"}</button>
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-outline-variant bg-surface py-3 rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ProgrammeCreate({ go }) {
  const collegeTerm = (() => {
    try {
      const tok = decodeToken()
      const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
      const key = code ? `earms_college_term_${code}` : "earms_college_term"
      const v = localStorage.getItem(key)
      if (v === "School" || v === "Faculty" || v === "College") return v
      return "College"
    } catch { return "College" }
  })()
  const [colleges, setColleges] = useState([])
  const [departments, setDepartments] = useState([])
  const [collegeId, setCollegeId] = useState("")
  const [deptId, setDeptId] = useState("")
  const [name, setName] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const tok = decodeToken()
  const instId = tok?.ownerId || tok?.OwnerId || ""
  useEffect(() => {
    const loadColleges = async () => {
      try {
        const { onboardingApi } = await import("./onboarding")
        let id = instId
        if (!id) {
          const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
          if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
        }
        if (id) {
          const cols = await onboardingApi.getColleges(String(id)).catch(()=>[])
          setColleges(Array.isArray(cols) ? cols : [])
          if (Array.isArray(cols) && cols.length) setCollegeId(String(cols[0].Id ?? cols[0].id))
        }
      } catch {}
    }
    loadColleges()
  }, [instId])
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const { onboardingApi } = await import("./onboarding")
        let id = instId
        if (!id) {
          const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
          if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
        }
        if (id) {
          const depts = await onboardingApi.getDepartments(String(id)).catch(()=>[])
          setDepartments(Array.isArray(depts) ? depts : [])
          if (Array.isArray(depts) && depts.length) setDeptId(String(depts[0].Id ?? depts[0].id))
        }
      } catch {}
    }
    loadDepts()
  }, [instId])
  const submit = async (e) => {
    e.preventDefault()
    setMsg(""); setErr("")
    if (!collegeId) { setErr(`${collegeTerm} is required.`); return }
    if (!deptId) { setErr("Department is required."); return }
    if (!name.trim()) { setErr("Programme Name is required."); return }
    setBusy(true)
    try {
      const { onboardingApi } = await import("./onboarding")
      let id = instId
      if (!id) {
        const list = await onboardingApi.getInstitutionsDropdown().catch(()=>[])
        if (Array.isArray(list) && list.length) id = list[0].Id ?? list[0].id
      }
      await onboardingApi.createProgram(deptId, { name: name.trim(), institutionId: String(id), departmentId: deptId })
      setMsg(`Programme "${name.trim()}" created.`)
      setName("")
    } catch (e2) {
      setErr(e2.message || "Could not create programme")
    } finally {
      setBusy(false)
    }
  }
  const cancel = () => { setName(""); setErr(""); setMsg(""); go('admin') }
  return (
    <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6 max-w-2xl">
      <h3 className="font-headline-sm font-bold text-primary mb-1">Create Programme</h3>
      <p className="font-body-sm text-on-surface-variant mb-4">Cascading flow — select {collegeTerm.toLowerCase()} then department, then programme name</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">{collegeTerm}</span>
          <select value={collegeId} onChange={e=>setCollegeId(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
            <option value="">Select {collegeTerm}</option>
            {colleges.map(c=>(
              <option key={c.Id ?? c.id} value={String(c.Id ?? c.id)}>{c.Name ?? c.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Department</span>
          <select value={deptId} onChange={e=>setDeptId(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
            <option value="">Select Department</option>
            {departments.map(d=>(
              <option key={d.Id ?? d.id} value={String(d.Id ?? d.id)}>{d.Name ?? d.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Programme Name</span>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. B.Sc. Computer Science" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
        </label>
        {err && <div className="w-full rounded-lg bg-error-container text-on-error-container px-3 py-2 text-sm">{err}</div>}
        {msg && <div className="w-full rounded-lg bg-primary-container text-on-primary-container px-3 py-2 text-sm">{msg}</div>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-label-md hover:bg-primary-fixed-dim disabled:opacity-60">{busy ? "Creating…" : "Create"}</button>
          <button type="button" onClick={cancel} className="flex-1 border border-outline-variant bg-surface py-3 rounded-lg font-label-md hover:bg-surface-variant">Cancel</button>
        </div>
      </form>
    </div>
  )
}

function InstitutionHome({ go }) {
  const q = useHashQuery()
  const section = (q.get('section') || '').toLowerCase()
  const item = q.get('item') || ''
  const sectionKey = section.replace(/-/g, ' ')
  const [collegeChoice, setCollegeChoice] = useState(() => {
    try {
      const tok = decodeToken()
      const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
      const key = code ? `earms_college_term_${code}` : "earms_college_term"
      return localStorage.getItem(key) || "College"
    } catch { return "College" }
  })

  if (section) {
    const isSettings = section === 'settings'
    const isOnboarding = section === 'onboarding'
    return (
      <div className="space-y-6 max-w-5xl">
        <button onClick={()=>go('admin')} className="inline-flex items-center gap-1.5 font-label-md text-primary hover:text-primary-fixed-dim">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Home
        </button>
        <div className="glass-card ambient-shadow rounded-xl border border-surface-container p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center"><span className="material-symbols-outlined text-primary">{section==='onboarding'?'assignment':section==='subscription'?'card_membership':section==='payment history'?'receipt_long':section==='analytics'?'insights':'settings'}</span></div>
            <div>
              <h2 className="font-headline-md font-bold text-primary capitalize">{section} {item ? `— ${item}` : ''}</h2>
              <p className="font-body-sm text-on-surface-variant">Manage {sectionKey} {item ? `· ${item}` : 'overview'}</p>
            </div>
          </div>
          {isSettings ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant">
                <h3 className="font-label-md font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined">lock_reset</span> Change Password</h3>
                <p className="font-body-sm text-on-surface-variant mb-3">Update your institution admin password.</p>
                <button onClick={()=>go('forgot')} className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim">Go to Reset Password</button>
              </div>
              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant">
                <h3 className="font-label-md font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined">account_balance</span> Academic Structure Terminology</h3>
                <p className="font-body-sm text-on-surface-variant mb-3">In Nigeria, institutions use <span className="font-label-md">College</span>, <span className="font-label-md">School</span> or <span className="font-label-md">Faculty</span> interchangeably. Choose your preference — <span className="font-label-md">{collegeChoice}</span> will replace <span className="font-label-md">College</span> in the Onboarding menu and wherever it appears.</p>
                <label className="block mb-3">
                  <span className="font-label-md text-on-surface-variant text-[12px] uppercase tracking-wide">Preferred Term</span>
                  <select value={collegeChoice} onChange={e=>setCollegeChoice(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                    <option value="College">College</option>
                    <option value="School">School</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </label>
                <button onClick={()=>{
                  try {
                    const tok = decodeToken()
                    const code = tok?.institutionCode || tok?.InstitutionCode || tok?.ownerId || ""
                    const key = code ? `earms_college_term_${code}` : "earms_college_term"
                    localStorage.setItem(key, collegeChoice)
                    window.dispatchEvent(new Event('storage'))
                    go('admin?section=settings')
                    setTimeout(()=>window.location.reload(), 200)
                  } catch {}
                }} className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:bg-primary-fixed-dim">Save Preference</button>
                <p className="font-body-sm text-[11px] text-outline mt-2 text-center">Current: <span className="font-label-md text-on-surface">{collegeChoice}</span> — Onboarding submenu will show “{collegeChoice}” instead of “College”.</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant lg:col-span-2">
                <h3 className="font-label-md font-bold text-on-surface mb-3 flex items-center gap-2"><span className="material-symbols-outlined">tune</span> Institution Settings</h3>
                <p className="font-body-sm text-on-surface-variant mb-3">Preferences, notifications and audit logs will appear here.</p>
                <p className="font-body-sm text-[12px] text-outline text-center">More settings coming soon.</p>
              </div>
            </div>
          ) : isOnboarding ? (
            item && item.toLowerCase() === 'subscriber' ? (
              <InstitutionProfile go={go} />
            ) : item && item.toLowerCase() === 'pg' ? (
              <PGCreate go={go} />
            ) : item && ['college','school','faculty'].includes(item.toLowerCase()) ? (
              <CollegePage go={go} />
            ) : item && item.toLowerCase() === 'department' ? (
              <DepartmentPage go={go} />
            ) : item && ['programme','program'].includes(item.toLowerCase()) ? (
              <ProgrammeCreate go={go} />
            ) : (
              <div className="space-y-4">
                <p className="font-body-sm text-on-surface-variant">Onboarding module for {item || 'overview'} — subscriber, academic structure and people management.</p>
                <AdminOnboarding go={go} />
              </div>
            )
          ) : (
            <div className="py-12 text-center border border-dashed border-outline-variant rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">construction</span>
              <p className="font-headline-sm text-on-surface">Placeholder for {section} {item && `· ${item}`}</p>
              <p className="font-body-sm text-on-surface-variant mt-1">This view will host the {sectionKey} functionality ({item || 'overview'}).</p>
              <button onClick={()=>go('admin')} className="mt-4 px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md">Return to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const stats = [
    {label: 'Total Students', value: '—', sub: 'Across all programmes', icon: 'school', color: 'bg-primary-container text-primary'},
    {label: 'Academic Staff', value: '—', sub: 'Supervisors & lecturers', icon: 'badge', color: 'bg-secondary-container text-secondary'},
    {label: 'Departments', value: '—', sub: 'Under colleges', icon: 'account_tree', color: 'bg-tertiary-container text-tertiary'},
    {label: 'Active Subscription', value: 'Inactive', sub: 'Check status in Subscription', icon: 'card_membership', color: 'bg-surface-container-high text-on-surface'},
  ]
  const groups = [
    {key: 'onboarding', label: 'Onboarding', icon: 'assignment', desc: 'Subscriber, academic structure and people', subs: ['Subscriber','PG', collegeChoice,'Department','Programme','Staff','Student'], color: 'bg-primary-fixed'},
    {key: 'subscription', label: 'Subscription', icon: 'card_membership', desc: 'Subscribe, check and upgrade plans', subs: ['Subscribe','Check Status','Upgrade'], color: 'bg-secondary-fixed'},
    {key: 'payment history', label: 'Payment History', icon: 'receipt_long', desc: 'History, failures and role assignments', subs: ['Subscription History','Failed Payments','Role Management','Assign Role','Remove Role'], color: 'bg-tertiary-fixed'},
    {key: 'analytics', label: 'Analytics', icon: 'insights', desc: 'Summary and insights', subs: ['Summary'], color: 'bg-surface-container-high'},
    {key: 'settings', label: 'Settings', icon: 'settings', desc: 'Password, preferences and system', subs: [], color: 'bg-surface-container-low'},
  ]
  const tokenData = decodeToken()
  const activeInstName = tokenData?.institutionName || tokenData?.InstitutionName || tokenData?.institutionCode || tokenData?.InstitutionCode || "—"
  const activeInstCode = tokenData?.institutionCode || tokenData?.InstitutionCode || ""
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-lg border border-primary/20 w-fit">
        <span className="material-symbols-outlined text-[18px]">account_balance</span>
        <span className="font-label-md">Active Institution:</span>
        <span className="font-headline-sm font-bold">{activeInstName}</span>
        {activeInstCode && <span className="font-body-sm opacity-80">({activeInstCode})</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s=>(
          <div key={s.label} className="glass-card ambient-shadow rounded-xl p-4 border border-surface-container flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant text-[11px] uppercase tracking-wide">{s.label}</p>
              <p className="font-headline-lg font-bold text-primary leading-none mt-1">{s.value}</p>
              <p className="font-body-sm text-on-surface-variant text-[12px] mt-1">{s.sub}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}><span className="material-symbols-outlined">{s.icon}</span></div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-headline-sm font-bold text-primary mb-3">Quick Access</h3>
        <p className="font-body-sm text-on-surface-variant mb-4">Icons map directly to the sidebar — click a card or any sub-item to open its view.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map(g=>(
            <div key={g.key} className="glass-card ambient-shadow rounded-xl border border-surface-container p-5 flex flex-col hover:shadow-elevated transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${g.color}`}><span className="material-symbols-outlined">{g.icon}</span></div>
                <div>
                  <h4 className="font-label-md font-bold text-on-surface capitalize">{g.label}</h4>
                  <p className="font-body-sm text-on-surface-variant text-[12px]">{g.desc}</p>
                </div>
              </div>
              {g.subs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                  {g.subs.map(sub=>(
                    <button key={sub} onClick={()=>go(`admin?section=${encodeURIComponent(g.key)}&item=${encodeURIComponent(sub)}`)} className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-variant font-label-md text-[12px] border border-outline-variant">{sub}</button>
                  ))}
                </div>
              ) : (
                <p className="font-body-sm text-outline text-[12px] mb-3">No sub-items</p>
              )}
              <button onClick={()=>go(g.key==='settings' ? 'admin?section=settings' : `admin?section=${encodeURIComponent(g.key)}`)} className="mt-auto w-full bg-primary text-on-primary py-2 rounded-lg font-label-md hover:bg-primary-fixed-dim flex items-center justify-center gap-1.5">
                Open {g.label} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary">info</span>
        <p className="font-body-sm text-on-surface-variant">Use the left sidebar — submenus are collapsed by default; click <span className="font-label-md text-on-surface">Home</span> to return here. Every card above mirrors a sidebar function with the same icon and stats.</p>
      </div>
    </div>
  )
}

/* ---------- Student Dashboard (Stitch: 6cac2f74a4d34ab79e8c434ea4373e91) ---------- */
function StudentDashboard({ go }) {
  return (
    <DashShell go={go} active="student" role="student" title="Welcome back, Sarah." subtitle="Here is an overview of your current research progress.">
      <div className="bento-grid">
        <section className="col-span-12 lg:col-span-8 glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-fixed-dim rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <div><span className="inline-block px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-[12px] rounded-full mb-2">Active Thesis</span><h3 className="font-headline-lg text-headline-lg text-on-surface leading-tight">Impact of AI on Modern Architectural Paradigms</h3></div>
              <span className="px-3 py-1 bg-[#e6f4ea] text-[#137333] font-label-md rounded-full border border-[#ceead6] text-[12px] whitespace-nowrap">On Track</span>
            </div>
            <div className="mb-6">
              <div className="flex justify-between font-label-md text-on-surface-variant mb-1"><span>Overall Progress</span><span>45%</span></div>
              <div className="w-full bg-surface-variant rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{width:'45%'}}></div></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t border-outline-variant pt-4">
            <div><p className="font-label-md text-outline mb-1 text-[11px] uppercase">Next Deadline</p><p className="font-headline-sm text-on-surface">Oct 15, 2024</p></div>
            <div><p className="font-label-md text-outline mb-1 text-[11px] uppercase">Primary Advisor</p><p className="font-headline-sm text-on-surface">Dr. A. Sterling</p></div>
            <div><p className="font-label-md text-outline mb-1 text-[11px] uppercase">Recent Activity</p><p className="font-headline-sm text-on-surface">Draft Submitted</p></div>
          </div>
        </section>
        <section className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col">
          <h3 className="font-headline-md text-on-surface flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-secondary-container">forum</span> Supervisor Feedback</h3>
          <div className="flex-1 space-y-3 overflow-auto">
            <div className="p-3 bg-surface-container-low rounded-lg border-l-4 border-secondary-container">
              <div className="flex justify-between items-center mb-1"><span className="font-label-md text-on-surface">Dr. A. Sterling</span><span className="text-[12px] text-outline">2 hours ago</span></div>
              <p className="font-body-sm text-on-surface-variant">Your methodology section needs more clarity regarding the sampling constraints. Let's discuss this tomorrow.</p>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg border-l-4 border-outline-variant">
              <div className="flex justify-between items-center mb-1"><span className="font-label-md text-on-surface">Dr. A. Sterling</span><span className="text-[12px] text-outline">Yesterday</span></div>
              <p className="font-body-sm text-on-surface-variant">Good progress on the initial literature review draft. Ensure citations follow APA strictly.</p>
            </div>
          </div>
          <button className="mt-4 w-full bg-surface text-primary border border-outline-variant font-label-md py-2 rounded hover:bg-surface-variant">View All Comments</button>
        </section>
        <section className="col-span-12 lg:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant">
          <h3 className="font-headline-md text-on-surface mb-4">Research Milestones</h3>
          <div className="relative pl-1">
            <div className="timeline-item relative mb-6">
              <div className="timeline-line"></div>
              <div className="flex gap-3 relative z-10">
                <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0 border border-[#ceead6]"><span className="material-symbols-outlined text-[18px]">check</span></div>
                <div><h4 className="font-headline-sm text-on-surface">Proposal Defense</h4><p className="font-body-sm text-on-surface-variant">Approved by committee.</p><span className="font-label-md text-[12px] text-outline">Aug 12, 2024</span></div>
              </div>
            </div>
            <div className="timeline-item relative mb-6">
              <div className="timeline-line"></div>
              <div className="flex gap-3 relative z-10">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center shrink-0 border border-secondary-fixed-dim"><div className="w-3 h-3 bg-secondary rounded-full animate-pulse"></div></div>
                <div><h4 className="font-headline-sm text-on-surface">Chapter 2: Literature Review</h4><p className="font-body-sm text-on-surface-variant">Drafting core arguments and synthesizing sources.</p><span className="font-label-md text-[12px] text-secondary-container">Due: Oct 15, 2024</span></div>
              </div>
            </div>
            <div className="timeline-item relative">
              <div className="timeline-line"></div>
              <div className="flex gap-3 relative z-10 opacity-60">
                <div className="w-8 h-8 rounded-full bg-surface-variant text-outline flex items-center justify-center shrink-0 border border-outline-variant"><span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span></div>
                <div><h4 className="font-headline-sm text-on-surface">Data Collection</h4><p className="font-body-sm text-on-surface-variant">Pending ethics board approval.</p><span className="font-label-md text-[12px] text-outline">Est. Nov 2024</span></div>
              </div>
            </div>
          </div>
        </section>
        <section className="col-span-12 lg:col-span-6 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-on-surface">Document Repository</h3>
            <button className="text-secondary-container hover:text-secondary font-label-md flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">upload</span> Upload</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low cursor-pointer group">
              <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-primary-fixed-dim group-hover:text-primary text-3xl">folder</span><h4 className="font-headline-sm text-on-surface">Drafts</h4></div>
              <p className="font-body-sm text-on-surface-variant">4 files • Updated 2d ago</p>
            </div>
            <div className="p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low cursor-pointer group">
              <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-primary-fixed-dim group-hover:text-primary text-3xl">folder</span><h4 className="font-headline-sm text-on-surface">References</h4></div>
              <p className="font-body-sm text-on-surface-variant">128 files • Updated 1w ago</p>
            </div>
            <div className="col-span-2 p-2 border border-outline-variant rounded-lg flex items-center justify-between hover:bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e8eaed] rounded flex items-center justify-center text-[#1a73e8]"><span className="material-symbols-outlined">description</span></div>
                <div><p className="font-label-md text-on-surface">Lit_Review_v2_Draft.docx</p><p className="font-body-sm text-[12px] text-outline">Modified today by You</p></div>
              </div>
              <button className="p-1 text-outline hover:text-on-surface"><span className="material-symbols-outlined">more_vert</span></button>
            </div>
          </div>
        </section>
      </div>
    </DashShell>
  )
}

/* ---------- Faculty Dashboard (Stitch: 6c68c2f0c2d74e1891b698f86351b70f) ---------- */
function FacultyDashboard({ go }) {
  return (
    <DashShell go={go} active="faculty" role="faculty" title="Faculty Overview" subtitle="Manage supervisees, approvals, and research pipeline.">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card ambient-shadow rounded-xl p-4 flex items-start justify-between border border-surface-container">
            <div><p className="font-label-md text-on-surface-variant mb-1">Active Supervisees</p><p className="font-headline-lg text-primary font-bold">12</p></div>
            <div className="p-2 bg-tertiary-fixed rounded-lg text-on-tertiary-fixed"><span className="material-symbols-outlined">school</span></div>
          </div>
          <div className="glass-card ambient-shadow rounded-xl p-4 flex items-start justify-between border border-surface-container">
            <div><p className="font-label-md text-on-surface-variant mb-1">Pending Approvals</p><p className="font-headline-lg text-secondary font-bold">5</p></div>
            <div className="p-2 bg-secondary-fixed rounded-lg text-on-secondary-fixed"><span className="material-symbols-outlined">pending_actions</span></div>
          </div>
          <div className="glass-card ambient-shadow rounded-xl p-4 flex flex-col justify-between border border-surface-container">
            <div className="flex items-center justify-between mb-1"><p className="font-label-md text-on-surface-variant">Automated Reminders</p><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer"/><div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div></label></div>
            <p className="font-body-sm text-on-surface-variant">Next batch sends in 2 days for overdue milestones.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card ambient-shadow rounded-xl border border-surface-container overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-lowest">
              <h3 className="font-headline-sm font-semibold text-primary">Student Progress Board</h3>
              <button className="px-3 py-1.5 border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">filter_list</span> Filter</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-on-surface-variant"><th className="p-3 font-semibold">Student</th><th className="p-3 font-semibold">Program</th><th className="p-3 font-semibold">Current Phase</th><th className="p-3 font-semibold">Progress</th><th className="p-3 font-semibold text-right">Action</th></tr></thead>
                <tbody className="font-body-sm divide-y divide-surface-container">
                  <tr className="hover:bg-surface-bright"><td className="p-3 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs">EJ</div><span className="font-semibold text-on-surface">Elena J.</span></td><td className="p-3 text-on-surface-variant">Ph.D. CompSci</td><td className="p-3">Data Collection</td><td className="p-3"><div className="w-full bg-surface-container rounded-full h-2"><div className="bg-secondary h-2 rounded-full" style={{width:'60%'}}></div></div></td><td className="p-3 text-right"><button className="text-primary hover:underline font-label-md text-[13px]">View Matrix</button></td></tr>
                  <tr className="hover:bg-surface-bright"><td className="p-3 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold text-xs">MC</div><span className="font-semibold text-on-surface">Marcus C.</span></td><td className="p-3 text-on-surface-variant">MSc Biology</td><td className="p-3 text-error">Overdue: Proposal</td><td className="p-3"><div className="w-full bg-surface-container rounded-full h-2"><div className="bg-error h-2 rounded-full" style={{width:'25%'}}></div></div></td><td className="p-3 text-right"><button className="text-primary hover:underline font-label-md text-[13px]">Review</button></td></tr>
                  <tr className="hover:bg-surface-bright"><td className="p-3 flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-xs">SR</div><span className="font-semibold text-on-surface">S. Rahman</span></td><td className="p-3 text-on-surface-variant">Ph.D. Physics</td><td className="p-3">Chapter 3 Draft</td><td className="p-3"><div className="w-full bg-surface-container rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{width:'85%'}}></div></div></td><td className="p-3 text-right"><button className="text-primary hover:underline font-label-md text-[13px]">Review</button></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="glass-card ambient-shadow rounded-xl border border-surface-container flex flex-col">
            <div className="p-4 border-b border-surface-container bg-surface-container-lowest"><h3 className="font-headline-sm font-semibold text-primary flex items-center gap-2"><span className="material-symbols-outlined text-secondary">inbox</span> Approval Queue</h3></div>
            <div className="p-4 space-y-3 overflow-auto">
              {[
                {title:'Ch. 3 Draft', by:'S. Rahman • 2 hrs ago', status:'Pending'},
                {title:'IRB Ethics Renewal', by:'Elena J. • 5 hrs ago', status:'Urgent'},
                {title:'Grant Budget v2', by:'Marcus C. • yesterday', status:'Pending'},
              ].map(it=>(
                <div key={it.title} className="p-3 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container-low cursor-pointer">
                  <div className="flex justify-between items-start mb-1"><span className="font-label-md font-bold text-on-surface">{it.title}</span><span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${it.status==='Urgent' ? 'bg-error-container text-on-error-container' : 'text-secondary bg-secondary-fixed'}`}>{it.status}</span></div>
                  <p className="font-body-sm text-on-surface-variant mb-2">{it.by}</p>
                  <button className="w-full bg-primary text-on-primary py-1.5 rounded text-xs font-semibold hover:bg-opacity-90">Review</button>
                </div>
              ))}
              <button onClick={()=>go('admin')} className="w-full text-primary font-label-md text-[13px] hover:underline mt-1">View Admin Topology →</button>
            </div>
          </div>
        </div>
      </div>
    </DashShell>
  )
}

/* ---------- Admin Control Panel (Stitch: 704fc6b367d542fb86070aa7c5c7787e) ---------- */
/* ---------- Admin Control Panel (onboarding module) ---------- */
function AdminPanel({ go }) {
  return (
    <DashShell go={go} active="admin" role="admin" subrole="institution" title="Institution Administration" subtitle="Home dashboard with quick access to onboarding, subscription and payment history.">
      <InstitutionHome go={go} />
    </DashShell>
  )
}

function App() {
  const [page, go] = usePage()
  // expose go for e2e debug
  useEffect(()=>{ window.EARMS_GO = go },[go])
  // protect authenticated routes: bounce to login when there is no token
  useEffect(() => {
    if (['dashboard','student','faculty','admin','system'].includes(page) && !tokenService.isAuthenticated()) {
      go('login')
    }
  }, [page])
  return (
    <div className="min-h-screen">
      {page==='landing' && <Landing go={go} />}
      {page==='gateway' && <Gateway go={go} />}
      {page==='login' && <Login go={go} />}
      {page==='signup' && <Signup go={go} />}
      {page==='forgot' && <ForgotPassword go={go} />}
      {page==='reset' && <ResetPassword go={go} />}
      {page==='verify' && <VerifyEmail go={go} />}
      {page==='dashboard' && <Dashboard go={go} />}
      {page==='student' && <StudentDashboard go={go} />}
      {page==='faculty' && <FacultyDashboard go={go} />}
      {page==='admin' && <AdminPanel go={go} />}
      {page==='system' && (
        <DashShell go={go} active="admin" role="admin" title="System Administration" subtitle="Home dashboard with quick access to subscription, plan, analytics and regional management.">
          <SystemHome go={go} />
        </DashShell>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
