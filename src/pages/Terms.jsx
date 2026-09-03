import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { WHATSAPP_NUMBERS } from '../utils/constants';

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-gray-900 font-bold text-lg mb-2">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-primary-600 text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <h1 className="text-gray-900 font-bold text-2xl mb-1">Conditions Générales d'Utilisation</h1>
        <p className="text-gray-400 text-xs mb-8">Dernière mise à jour : 1 septembre 2026</p>

        <Section title="1. Objet">
          <p>
            ApollonPay (« nous ») propose un service de mise en relation permettant à ses utilisateurs
            (« vous », « le client ») d'effectuer des dépôts et des retraits entre leur compte Mobile Money
            (Orange Money, Moov Money, Telecel Money) et leur compte sur des plateformes de paris sportifs en
            ligne tierces (1XBET, Melbet, Betwinner), via un réseau d'agents, ainsi que de payer des
            abonnements CANAL+ et CANALBOX directement depuis l'application.
          </p>
          <p>
            ApollonPay n'est ni éditeur, ni opérateur, ni partenaire des plateformes de paris sportifs ou des
            fournisseurs d'abonnement mentionnés. Nous fournissons uniquement un service d'intermédiation
            financière pour le transfert de fonds.
          </p>
        </Section>

        <Section title="2. Inscription et compte">
          <p>
            L'utilisation du service nécessite la création d'un compte avec un numéro de téléphone valide.
            Vous devez être âgé d'au moins 18 ans et avoir la capacité juridique de contracter pour utiliser
            ce service, les paris sportifs étant réservés aux personnes majeures.
          </p>
          <p>
            Vous êtes responsable de l'exactitude des informations fournies (numéro de téléphone, identifiant
            de compte sur la plateforme de paris ou d'abonnement) et de la confidentialité de vos identifiants
            de connexion.
          </p>
        </Section>

        <Section title="3. Fonctionnement du service">
          <p>
            Chaque dépôt ou retrait est traité par un agent ApollonPay disponible au moment de la demande. Les
            délais de traitement affichés dans l'application sont indicatifs et peuvent varier selon la
            disponibilité des agents et des opérateurs Mobile Money.
          </p>
          <p>
            Il vous appartient de vérifier l'exactitude du montant, du numéro Mobile Money et de
            l'identifiant de compte (paris ou abonnement) avant de confirmer toute transaction. ApollonPay ne
            peut être tenu responsable d'une transaction effectuée vers un identifiant ou un numéro erroné
            fourni par l'utilisateur.
          </p>
        </Section>

        <Section title="4. Frais">
          <p>
            Les éventuels frais de service applicables, s'il y en a, sont communiqués avant la confirmation
            de chaque transaction. L'utilisation du service Mobile Money de votre opérateur (Orange Money,
            Moov Money, Telecel Money) peut par ailleurs entraîner des frais propres à cet opérateur,
            indépendants d'ApollonPay.
          </p>
        </Section>

        <Section title="5. Responsabilité">
          <p>
            ApollonPay agit en tant qu'intermédiaire de transfert de fonds et n'intervient à aucun moment dans
            les paris effectués sur les plateformes tierces ni dans la fourniture des services d'abonnement.
            Nous ne sommes pas responsables des pertes liées aux paris eux-mêmes, ni du fonctionnement, de la
            disponibilité ou des conditions des plateformes de paris sportifs, des fournisseurs d'abonnement
            ou des opérateurs Mobile Money.
          </p>
          <p>
            Notre responsabilité ne saurait être engagée en cas d'interruption du service due à une panne
            des réseaux Mobile Money, des plateformes tierces, ou de tout cas de force majeure.
          </p>
        </Section>

        <Section title="6. Protection des données personnelles">
          <p>
            Les données personnelles collectées (numéro de téléphone, historique de transactions) sont
            utilisées exclusivement pour la fourniture du service et ne sont pas cédées à des tiers à des
            fins commerciales. Conformément à la réglementation en vigueur au Burkina Faso en matière de
            protection des données à caractère personnel, vous disposez d'un droit d'accès, de rectification
            et de suppression de vos données, que vous pouvez exercer en nous contactant via les canaux
            d'assistance indiqués ci-dessous.
          </p>
        </Section>

        <Section title="7. Suspension et résiliation">
          <p>
            ApollonPay se réserve le droit de suspendre ou de résilier l'accès à un compte en cas de fraude
            suspectée, d'usage abusif du service, ou de non-respect des présentes conditions.
          </p>
        </Section>

        <Section title="8. Modification des CGU">
          <p>
            Les présentes conditions peuvent être modifiées à tout moment. La version en vigueur est celle
            publiée dans l'application au moment de l'utilisation du service.
          </p>
        </Section>

        <Section title="9. Droit applicable">
          <p>
            Les présentes conditions sont régies par le droit burkinabè. Tout litige relatif à leur
            interprétation ou leur exécution relève de la compétence des tribunaux de Ouagadougou, Burkina
            Faso.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Pour toute question relative à ces conditions ou au service, contactez notre assistance via
            WhatsApp au {WHATSAPP_NUMBERS.map(n => `+${n}`).join(' ou ')}.
          </p>
        </Section>

        <div className="border-t border-gray-200 pt-4 mt-8">
          <p className="text-gray-400 text-xs">
            ApollonPay — Burkina Faso.
          </p>
        </div>
      </div>
    </div>
  );
}
