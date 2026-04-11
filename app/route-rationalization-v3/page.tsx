import ProtectedRoute from '@/components/ProtectedRoute';
import V3PresentationDashboard from '@/components/rationalization-v3/V3PresentationDashboard';
import { getRouteRationalizationV3Dataset, V3_SOURCE_FILES } from '@/lib/routeRationalizationV3';

export default async function RouteRationalizationV3Page() {
  const dataset = await getRouteRationalizationV3Dataset();

  return (
    <ProtectedRoute>
      <V3PresentationDashboard
        routes={dataset.routes}
        log={dataset.log}
        summary={dataset.summary}
        updatedAt={dataset.updatedAt}
        sourceFiles={V3_SOURCE_FILES}
      />
    </ProtectedRoute>
  );
}
