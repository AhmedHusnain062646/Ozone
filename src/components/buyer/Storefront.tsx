// ABOUTME: Home route: editorial hero. The catalog grid is added by the catalog milestone; <Outlet/> hosts routed modals.
// ABOUTME: Hero image is a module import so the production build hashes and serves it.
import { Outlet } from 'react-router';
import hero from '../../assets/images/ozone_hero_luxury_living_1794146207794.jpg';

export function Storefront() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-graphite">
        <img src={hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        <div className="mx-auto max-w-[1440px] px-margin py-24 text-bone md:px-16 md:py-36">
          <p className="label-caps text-mint">Independent ateliers · Limited editions</p>
          <h1 className="mt-4 max-w-3xl font-display text-[38px] leading-[44px] md:text-[64px] md:leading-[72px]">
            Objects made slowly, by hands you can name.
          </h1>
        </div>
      </section>
      <Outlet />
    </>
  );
}
