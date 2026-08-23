import { ListingsApp } from '@/src/components/ListingsApp';
import { siteConfig } from '@/src/config/site';
import { listings } from '@/src/data/listings';

export default function Home() {
  return <ListingsApp config={siteConfig} listings={listings} />;
}
