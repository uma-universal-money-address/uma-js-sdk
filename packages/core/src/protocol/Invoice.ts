import { CounterPartyDataOptions } from "./CounterPartyData.js";
import { Currency } from "./Currency.js";
import { KycStatus } from "./KycStatus.js";
import { bech32 } from "bech32";

interface TLVCodable {
    toTLV(): Uint8Array
}

export class InvoiceCurrency implements TLVCodable {
    constructor(
        // code is the ISO 4217 (if applicable) currency code (eg. "USD"). For cryptocurrencies, this will  be a ticker
        // symbol, such as BTC for Bitcoin.
        public readonly code: string,

        // name is the full display name of the currency (eg. US Dollars).
        public readonly name: string,

        // symbol is the symbol used to represent the currency (eg. $).
        public readonly symbol: string,

        // The number of digits after the decimal point for display on the sender side
        public readonly decimals: number
    ) {}

    toTLV(): Uint8Array {
        return new Uint8Array()
    }

    fromTLV(): void {
        
    } 
}

export class Invoice implements TLVCodable {
    private tlvMembers = {
        "receiverUma": 0,
        "invoiceUUID": 1,
        "amount": 2,
        "receivingCurrency": 3,
        "expiration": 4,
        "isSubectToTravelRule": 5,
        "requiredPayerData": 6,
        "umaVersion": 7,
        "commentCharsAllowed": 8,
        "senderUma": 9,
        "invoiceLimit": 10,
        "kycStatus": 11,
        "callback": 12,
        "signature": 100
    }

    constructor(
        // Receiving UMA address
        public readonly receiverUma: string,

        // Invoice UUID Served as both the identifier of the UMA invoice, and the validation of proof of payment.
        public readonly invoiceUUID: string,
        
        // The amount of invoice to be paid in the smalest unit of the ReceivingCurrency.
        public readonly amount: number,

        // The currency of the invoice
        public readonly receivingCurrency: Currency,

        // The unix timestamp the UMA invoice expires
        public readonly expiration: number,

        // Indicates whether the VASP is a financial institution that requires travel rule information.
        public readonly isSubectToTravelRule: boolean,
        
        // RequiredPayerData the data about the payer that the sending VASP must provide in order to send a payment.    
        public readonly requiredPayerData: CounterPartyDataOptions | undefined, 
        
        // UmaVersion is a list of UMA versions that the VASP supports for this transaction. It should be
	    // containing the lowest minor version of each major version it supported, separated by commas.    
        public readonly umaVersion: string,
        
        // CommentCharsAllowed is the number of characters that the sender can include in the comment field of the pay request.    
        public readonly commentCharsAllowed: number | undefined,

        // The sender's UMA address. If this field presents, the UMA invoice should directly go to the sending VASP instead of showing in other formats.
        public readonly senderUma: string | undefined,
        
        // The maximum number of the invoice can be paid
        public readonly invoiceLimit: number | undefined,

        // KYC status of the receiver, default is verified.
        public readonly kycStatus: KycStatus | undefined,

        // The callback url that the sender should send the PayRequest to.    
        public readonly callback: string,

        // The signature of the UMA invoice
        public readonly signature: Uint8Array
    ) {}

    toTLV(): Uint8Array {
        var doByteThings = (a:any) => { console.log(a)}
        Object.keys(this).forEach(key => {
            if (key in this.tlvMembers) {
                doByteThings(this[key as keyof Invoice])

            } 
        })
        return new Uint8Array();
    }

    unmarshalTLV(bytes: Uint8Array): void {

    }

    toBech32String(): string { 
        return bech32.encode("uma", this.toTLV());
    }

    fromBech32String(): void {
        // return bech32.decode(this.from)
    }
}