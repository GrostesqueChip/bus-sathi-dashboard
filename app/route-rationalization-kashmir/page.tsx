import ProtectedRoute from '@/components/ProtectedRoute';
import KashmirPresentationDashboard from '@/components/rationalization-kashmir/KashmirPresentationDashboard';
import { getRouteRationalizationKashmirDataset, KASHMIR_SOURCE_FILES } from '@/lib/routeRationalizationKashmir';

export default async function RouteRationalizationKashmirPage() {
  const dataset = await getRouteRationalizationKashmirDataset();

  return (
    <ProtectedRoute>
      <KashmirPresentationDashboard
        routes={dataset.routes}
        log={dataset.log}
        summary={dataset.summary}
        updatedAt={dataset.updatedAt}
        sourceFiles={KASHMIR_SOURCE_FILES}
      />
    </ProtectedRoute>
  );
}
