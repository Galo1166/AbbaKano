import Link from "next/link";
import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

const services = [
  { title: "Airtime", description: "Recharge supported mobile networks.", href: "/airtime", symbol: "signal_cellular_alt" },
  { title: "Data bundles", description: "Browse data plans for MTN, Airtel, Glo, and 9mobile.", href: "/data", symbol: "wifi" },
  { title: "Electricity", description: "Pay prepaid and postpaid electricity bills.", href: "/electricity", symbol: "bolt" },
  { title: "Cable TV", description: "Renew DStv, GOtv, and Startimes subscriptions.", href: "/cable-tv", symbol: "live_tv" },
];

export default function ServicesPage() {
  return (
    <CustomerPageLayout active="profile" eyebrow="Explore" title="Services" subtitle="Choose a bill or top-up service." className="profile-page" headerClassName="profile-header">
      <section className="profile-content">
        <div className="profile-list" aria-label="Available services">
          {services.map((service) => (
            <Link className="profile-row" href={service.href} key={service.title}>
              <span className="profile-row-icon" aria-hidden="true"><span className="profile-service-symbol">{service.symbol}</span></span>
              <span className="profile-row-copy"><strong>{service.title}</strong><small>{service.description}</small></span>
              <span className="profile-chevron" aria-hidden="true">-&gt;</span>
            </Link>
          ))}
        </div>
      </section>
    </CustomerPageLayout>
  );
}