import { NetworkHero } from "@/sites/zode/components/NetworkHero";
import { NetworkHow } from "@/sites/zode/components/NetworkHow";
import { WorkloadShowcase } from "@/sites/zode/components/WorkloadShowcase";
import { NetworkCustomers } from "@/sites/zode/components/NetworkCustomers";
import { LiveGpuPrices } from "@/sites/zode/components/LiveGpuPrices";

export default function NetworkPage() {
  return (
    <>
      <NetworkHero />
      <LiveGpuPrices />
      <NetworkHow />
      <WorkloadShowcase />
      <NetworkCustomers />
    </>
  );
}
