import Link from "next/link";

export default function ReturnPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 py-16 px-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">
          Return and Refund Policy
        </h1>
        <div className="text-sm text-white/80 flex items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.25 8.25a.75.75 0 1 1-1.06 1.06L19.5 12.94V19.5a2.25 2.25 0 0 1-2.25 2.25h-3a.75.75 0 0 1-.75-.75V15a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75v6a.75.75 0 0 1-.75.75h-3A2.25 2.25 0 0 1 4.5 19.5v-6.56l-.22.22a.75.75 0 1 1-1.06-1.06l8.25-8.25Z" />
            </svg>
            Home
          </Link>
          <span>/</span>
          <span>Return and Refund Policy</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-white shadow-md rounded-xl p-6 md:p-10 my-10 text-gray-800">
        <p className="text-sm text-gray-600 mb-8">Last updated: April 20, 2026</p>

        <div className="space-y-6 leading-7">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Return and Refund Policy</h2>
          <p>Thank you for shopping at Shop99.</p>
          <p>
            If, for any reason, You are not completely satisfied with a purchase
            We invite You to review our policy on refunds and returns.
          </p>
          <p>
            The following terms are applicable for any products that You
            purchased with Us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">
            Interpretation and Definitions
          </h2>
          <h3 className="text-xl font-semibold mb-2">Interpretation</h3>
          <p>
            The words whose initial letters are capitalized have meanings
            defined under the following conditions. The following definitions
            shall have the same meaning regardless of whether they appear in
            singular or in plural.
          </p>

          <h3 className="text-xl font-semibold mt-5 mb-2">Definitions</h3>
          <p>For the purposes of this Return and Refund Policy:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Company (referred to as either "the Company", "We", "Us" or
              "Our" in this Policy) refers to Prakash electronics (India),
              GROUND FLOOR, 804/24-26,940/23,939/23, GT KARNAL ROAD, DDA
              SANGAM PARK MARKET, SIDHORAN KALAN, Delhi, India, Delhi.
            </li>
            <li>Goods refer to the items offered for sale on the Service.</li>
            <li>Orders mean a request by You to purchase Goods from Us.</li>
            <li>Service refers to the Website.</li>
            <li>
              Website refers to Shop99, accessible from
              {" "}
              <a
                href="https://www.shop99.co.in/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                https://www.shop99.co.in/
              </a>
              .
            </li>
            <li>
              You means the individual accessing or using the Service, or the
              company, or other legal entity on behalf of which such individual
              is accessing or using the Service, as applicable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Your Order Return Rights</h2>
          <p>
            You are entitled to return Your Order within 7 days only if wrong
            or damaged product received.
          </p>
          <p>
            The deadline for returning an Order is 7 days from the date on
            which You received the Goods or on which a third party you have
            appointed, who is not the carrier, takes possession of the product
            delivered.
          </p>
          <p>
            In order to exercise Your right of return, You must inform Us of
            your decision by means of a clear statement. You can inform Us of
            your decision by:
          </p>
          <ul className="list-disc pl-6">
            <li>By phone: +918920114845</li>
          </ul>
          <p>
            We will reimburse You no later than 14 days from the day on which
            We receive the returned Goods. We will use the same/other means of
            payment as You used for the Order, and You will not incur any fees
            for such reimbursement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Conditions for Returns</h2>
          <p>In order for the Goods to be eligible for a return, please make sure that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The Goods were purchased in the last 7 days.</li>
            <li>The Goods are in the original packaging.</li>
          </ul>

          <p className="mt-4">The following Goods cannot be returned:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              The supply of Goods made to Your specifications or clearly
              personalized.
            </li>
            <li>
              The supply of Goods which according to their nature are not
              suitable to be returned, deteriorate rapidly or where the date of
              expiry is over.
            </li>
            <li>
              The supply of Goods which are not suitable for return due to
              health protection or hygiene reasons and were unsealed after
              delivery.
            </li>
            <li>
              The supply of Goods which are, after delivery, according to their
              nature, inseparably mixed with other items.
            </li>
          </ul>

          <p className="mt-4">
            We may refuse returns that do not meet the conditions above, to the
            extent permitted by applicable law.Only regular priced Goods may be
            refunded. Unfortunately, Goods on sale cannot be refunded. This
            exclusion may not apply to You if it is not permitted by applicable
            law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Returning Goods</h2>
          <p>
            You are responsible for the cost and risk of returning the Goods to
            Us.
          </p>
          <p>You should send the Goods at the following address:</p>
          <p className="font-medium">
            GROUND FLOOR, 804/24-26,940/23,939/23, GT KARNAL ROAD, DDA SANGAM
            PARK MARKET, SIDHORAN KALAN, Delhi, India, Delhi
          </p>
          <p>
            We cannot be held responsible for Goods damaged or lost in return
            shipment. Therefore, We recommend an insured and trackable mail
            service. We are unable to issue a refund without actual receipt of
            the Goods or proof of received return delivery.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
          <p>
            If you have any questions about our Returns and Refunds Policy,
            please contact us:
          </p>
          <ul className="list-disc pl-6">
            <li>By phone: +918920114845</li>
          </ul>
        </section>
        </div>
      </div>
    </div>
  );
}