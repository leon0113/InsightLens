export type DemoDataset = {
  slug: string;
  title: string;
  fileName: string;
  description: string;
};

// The same three slugs the API serves from sample-data/ (see the report module's DEMO_DATASETS).
export const DEMO_DATASETS: DemoDataset[] = [
  {
    slug: 'ecommerce-orders',
    title: 'E-commerce orders',
    fileName: 'ecommerce_orders.csv',
    description:
      'Two date formats in one column, repeated rows and prices with a long tail.',
  },
  {
    slug: 'clinic-appointments',
    title: 'Clinic appointments',
    fileName: 'clinic_appointments.csv',
    description:
      'Unknown ages coded as 999, a column that never changes and blood pressure readings that move together.',
  },
  {
    slug: 'sensor-readings',
    title: 'Sensor readings',
    fileName: 'sensor_readings.csv',
    description:
      'Semicolons instead of commas, Windows-1252 encoding and broken lines the reader skips.',
  },
];

export const demoPath = (slug: string) => `/demo/${slug}`;

export const DEMO_PATH = demoPath('clinic-appointments');
