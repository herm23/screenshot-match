import logoLight from '@/assets/logo-shopt.png';
import logoDark from '@/assets/logo-shopt-dark.png';

// Due versioni del logo: scritta blu sul tema chiaro, scritta chiara sul tema scuro (vedi .logo-* in styles.css)
export function Logo({ className = '' }: { className?: string }) {
  return (
    <>
      <img src={logoLight} alt="SHOPT" width={999} height={284} className={`logo-light h-auto ${className}`} />
      <img src={logoDark} alt="SHOPT" width={999} height={284} className={`logo-dark h-auto ${className}`} />
    </>
  );
}
