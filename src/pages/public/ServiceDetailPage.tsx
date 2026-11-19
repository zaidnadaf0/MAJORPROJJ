import { Link, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { FIXTURE_SERVICES } from '@/lib/fixtures';

/**
 * Public service detail. This is catalogue/safety copy only — it does not
 * promise a price, an ETA, or an available mechanic. The request flow shows
 * the live estimate and the backend decides eligibility and assignment.
 */

interface ServiceDetail {
  included: string[];
  before: string[];
  safety: string[];
  stop: string;
}

const DETAILS: Record<string, ServiceDetail> = {
  towing: {
    included: [
      'Flatbed or wheel-lift recovery within the mechanic’s stated radius',
      'Loading and securing the vehicle by the operator',
      'Delivery to a garage or safe location you agree on',
    ],
    before: [
      'Turn on hazard lights and move occupants behind a barrier if possible',
      'Share the exact location and any access limits (height, gate, soft ground)',
      'Tell us if the vehicle is damaged, lowered, or all-wheel drive',
    ],
    safety: [
      'Stand well away from traffic and never behind a vehicle being loaded',
      'Do not try to tow a vehicle with a rope or a non-rated strap',
      'If the vehicle is in a live lane, contact local emergency services first',
    ],
    stop: 'Stop and call emergency services if there is fire, fuel leakage, or an occupant is in danger.',
  },
  battery: {
    included: [
      'Jump start with a protected boost pack',
      'Battery and terminal condition check',
      'Guidance on whether a replacement is needed',
    ],
    before: [
      'Note whether the engine cranks slowly, clicks, or does nothing',
      'Check that the vehicle is in Park or Neutral with the handbrake on',
      'Mention any battery warning light or recent electrical work',
    ],
    safety: [
      'Battery acid is corrosive and charging can release flammable gas',
      'Do not smoke, and keep flames and sparks away from the battery',
      'Do not attempt a jump start beside moving traffic or in standing water',
    ],
    stop: 'Stop if you see swelling, smoke, leaking fluid, or smell a strong rotten-egg odour.',
  },
  tire: {
    included: [
      'Spare-wheel fitting when a safe, serviceable spare is available',
      'Puncture assessment and temporary repair where appropriate',
      'Advice on replacement if the tyre cannot be made roadworthy',
    ],
    before: [
      'Move to a safe place away from live traffic before inspecting anything',
      'Tell us which wheel is affected and whether a spare is in the vehicle',
      'Do not continue driving on a visibly flat or damaged tyre',
    ],
    safety: [
      'Never change a wheel on a live carriageway or an unprotected shoulder',
      'Do not work under a vehicle supported only by a jack',
      'Use a warning triangle only where it is safe to place one',
    ],
    stop: 'Stop and request recovery if the wheel, hub, or suspension is damaged, or the vehicle is unstable.',
  },
  fuel: {
    included: [
      'A limited emergency fuel delivery (petrol or diesel, as requested)',
      'Help identifying the correct fuel type',
      'Guidance if the wrong fuel was added',
    ],
    before: [
      'Confirm the fuel type and whether the vehicle is petrol, diesel, or hybrid',
      'Tell us if the vehicle is in a tunnel, car park, or restricted area',
      'Do not attempt to siphon or store fuel yourself',
    ],
    safety: [
      'No smoking, naked flames, or phone use while fuel is transferred',
      'Keep other people and vehicles clear of the transfer area',
      'If you suspect the wrong fuel was used, do not start the engine',
    ],
    stop: 'Stop and call emergency services for any spill, fire risk, or fuel leaking onto the road.',
  },
  lockout: {
    included: [
      'Non-destructive entry attempt by an authorised technician',
      'Identity and ownership checks before work starts',
      'Guidance if entry cannot be made safely',
    ],
    before: [
      'Have your ID and vehicle documents ready for verification',
      'Check whether a child or pet is inside the vehicle',
      'Tell us if the key is visible inside or the alarm is active',
    ],
    safety: [
      'Do not break glass or force a door — this can cause injury and costly damage',
      'Keep children and pets away from the vehicle and traffic',
      'If a person or animal is in danger, contact emergency services first',
    ],
    stop: 'Stop and call emergency services if a child, pet, or vulnerable person is locked inside.',
  },
  winch: {
    included: [
      'Recovery assessment before any pull is attempted',
      'Winching from a safe, rated anchor point where conditions allow',
      'Referral to specialist recovery if the situation is unsafe',
    ],
    before: [
      'Confirm the vehicle is not in rising water or on an unstable slope',
      'Share photos or a clear description of the ground and access',
      'Tell us about any occupants, cargo, or trailers',
    ],
    safety: [
      'Never stand in the line of a winch cable or strap',
      'Stay out of water with any current, and away from soft edges',
      'Do not attach a strap to a non-rated point or another moving vehicle',
    ],
    stop: 'Stop and call emergency services if anyone is trapped, injured, or the vehicle is in deep or fast water.',
  },
};

export function ServiceDetailPage() {
  const { id = '' } = useParams();
  const service = FIXTURE_SERVICES.find((item) => item.id === id);
  const detail = DETAILS[id];

  if (!service || !detail) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <PageHeader title="Service not found" description="This service page does not exist. Browse the catalogue to choose a roadside service." />
        <EmptyState title="Unknown service" description="The link may be outdated. The pricing page lists every service RoadAssist currently covers in this build." />
        <div className="mt-4"><Link to="/pricing" className="text-safety-400 hover:text-safety-300 underline">View the service catalogue</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <Link to="/pricing" className="text-sm font-medium text-safety-600 hover:text-safety-700">← All services</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <PageHeader title={service.name} description={service.desc} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">from ₹{service.base}</Badge>
            <Badge tone="neutral">typical response {service.eta}</Badge>
            <Badge tone="warning">final estimate approved before work</Badge>
          </div>

          <Card className="mt-6">
            <h2 className="font-bold text-cream">What is included</h2>
            <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-cream-dim">
              {detail.included.map((line) => (
                <li key={line} className="flex gap-2"><Icon name="check" size={16} className="mt-1 shrink-0 text-success" />{line}</li>
              ))}
            </ul>
          </Card>

          <Card className="mt-4">
            <h2 className="font-bold text-cream">Before you request</h2>
            <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-cream-dim">
              {detail.before.map((line) => (
                <li key={line} className="flex gap-2"><Icon name="info" size={16} className="mt-1 shrink-0 text-safety-600" />{line}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card className="border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2">
              <Icon name="triangle-alert" size={18} className="text-warning" />
              <h2 className="font-bold text-cream">Safety first</h2>
            </div>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-cream-dim">
              {detail.safety.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-cream">{detail.stop}</p>
          </Card>

          <Card>
            <h2 className="font-bold text-cream">How the request works</h2>
            <ol className="mt-2 grid gap-2 text-sm leading-6 text-cream-dim">
              <li>1. Add your vehicle and confirm the breakdown location.</li>
              <li>2. Review eligible mechanics and any ranked recommendations.</li>
              <li>3. Approve the estimate before repair work starts.</li>
              <li>4. Record the offline payment method after completion.</li>
            </ol>
            <p className="mt-2 text-xs leading-5 text-cream-dim">The catalogue price is indicative, not a quote. RoadAssist does not verify cash or UPI payments.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/signup" className="text-safety-400 hover:text-safety-300 underline">Create an account</Link>
              <Link to="/customer/login" className="text-cream-dim hover:text-cream underline">Sign in to request</Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
