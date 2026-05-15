import { redirect } from 'next/navigation';

export default async function QRRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dispensers/${id}`);
}
