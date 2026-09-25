const DEFAULT_BASE_URL = "https://api.vtugate.com/api/v1";
const REQUEST_TIMEOUT_MS = Number(process.env.VTU_GATE_TIMEOUT_MS || 15000);

class VtuGateError extends Error {
    constructor(message, { status, payload } = {}) {
        super(message);
        this.name = "VtuGateError";
        this.status = status;
        this.payload = payload;
    }
}

function encodeValue(value) {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (value === null || value === undefined) return "";
    return String(value);
}

function formBody(params = {}) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) body.set(key, encodeValue(value));
    }
    return body;
}

function providerMessage(payload, fallback) {
    return payload?.message
        || payload?.error
        || payload?.data?.message
        || payload?.data?.error
        || fallback;
}

class VtuGateProvider {
    constructor({ baseUrl = process.env.VTU_GATE_BASE_URL || DEFAULT_BASE_URL, apiKey = process.env.VTU_GATE_API_KEY, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.apiKey = apiKey;
        this.timeoutMs = timeoutMs;
    }

    assertConfigured() {
        if (!this.apiKey) throw new VtuGateError("VTU_GATE_API_KEY must be configured");
    }

    async request(path, params = {}) {
        this.assertConfigured();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Bearer ${this.apiKey}`
            },
            body: formBody(params),
            signal: AbortSignal.timeout(this.timeoutMs)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.status !== true) {
            throw new VtuGateError(providerMessage(payload, `VTU Gate request failed with HTTP ${response.status}`), {
                status: response.status,
                payload
            });
        }
        return payload;
    }

    accountDetails() {
        return this.request("/accountdetails");
    }

    transactionStatus(params) {
        return this.request("/transactionstatus", params);
    }

    transactionHistory(params = {}) {
        return this.request("/transactionhistory", params);
    }

    fetchServices(params) {
        return this.request("/fetchservices", params);
    }

    fetchAllServices() {
        return this.request("/fetchallservices");
    }

    buyAirtime({ serviceId, phoneNumber, amount }) {
        return this.request("/buyairtime", {
            service_id: serviceId,
            phone_number: phoneNumber,
            amount
        });
    }

    buyBulkAirtime({ serviceId, amount, phones }) {
        return this.request("/buybulkairtime", {
            service_id: serviceId,
            amount,
            phones
        });
    }

    fetchDataPlans({ serviceId }) {
        return this.request("/fetchdataplans", { service_id: serviceId });
    }

    buyData({ serviceId, phoneNumber, amount, planCode }) {
        return this.request("/buydata", {
            service_id: serviceId,
            phone_number: phoneNumber,
            amount,
            plan_code: planCode
        });
    }

    verifyCableTv({ serviceId, phone, smartcardNumber }) {
        return this.request("/verifycabletv", {
            service_id: serviceId,
            phone,
            smartcard_number: smartcardNumber
        });
    }

    buyCableTv({ serviceId, phone, smartcardNumber, amount, planCode, planName }) {
        return this.request("/buycabletv", {
            service_id: serviceId,
            phone,
            smartcard_number: smartcardNumber,
            amount,
            plan_code: planCode,
            plan_name: planName
        });
    }

    verifyElectricity({ serviceId, meterNo, disco }) {
        return this.request("/verifyelectricity", {
            service_id: serviceId,
            meter_no: meterNo,
            disco
        });
    }

    buyElectricity({ serviceId, meterNo, disco, amount, phoneNumber }) {
        return this.request("/buyelectricity", {
            service_id: serviceId,
            meter_no: meterNo,
            disco,
            amount,
            phone_number: phoneNumber
        });
    }

    getEducationTypePrice({ serviceId }) {
        return this.request("/geteducationtypeprice", { service_id: serviceId });
    }

    buyEducation({ serviceId, phone, quantity, productCode }) {
        return this.request("/buyeducation", {
            service_id: serviceId,
            phone,
            quantity,
            product_code: productCode
        });
    }

    registerSenderId({ senderId, companyName, companyWebsite, natureOfBusiness, sampleSms, smsType, phoneNumber, purpose }) {
        return this.request("/registersenderid", {
            sender_id: senderId,
            company_name: companyName,
            company_website: companyWebsite,
            nature_of_business: natureOfBusiness,
            sample_sms: sampleSms,
            sms_type: smsType,
            phone_number: phoneNumber,
            purpose
        });
    }

    listSenderIds() {
        return this.request("/listsenderids");
    }

    sendSms({ senderId, recipient, message, serviceId }) {
        return this.request("/sendsms", {
            sender_id: senderId,
            recipient,
            message,
            service_id: serviceId
        });
    }

    sendBulkSms({ senderId, recipient, message, serviceId }) {
        return this.request("/sendbulksms", {
            sender_id: senderId,
            recipient,
            message,
            service_id: serviceId
        });
    }

    smsHistory(params = {}) {
        return this.request("/smshistory", params);
    }

    fetchCountries() {
        return this.request("/international/countries");
    }

    fetchOperators({ countryCode, type } = {}) {
        return this.request("/international/operators", {
            country_code: countryCode,
            type
        });
    }

    detectOperator({ phoneNumber, countryCode }) {
        return this.request("/international/detectoperator", {
            phone_number: phoneNumber,
            country_code: countryCode
        });
    }

    previewFxRate({ operatorId, amount }) {
        return this.request("/international/fxrate", {
            operator_id: operatorId,
            amount
        });
    }

    buyInternationalTopup({ operatorId, amount, countryCode, recipientNumber }) {
        return this.request("/international/topup", {
            operator_id: operatorId,
            amount,
            country_code: countryCode,
            recipient_number: recipientNumber
        });
    }

    internationalTopupStatus({ transactionId }) {
        return this.request("/international/topupstatus", { transaction_id: transactionId });
    }

    internationalTopupHistory(params = {}) {
        return this.request("/international/history", params);
    }

    async purchase({ type, serviceId, phone, amount, planCode, reference }) {
        let response;
        if (type === "airtime") {
            response = await this.buyAirtime({ serviceId, phoneNumber: phone, amount });
        } else if (type === "data") {
            response = await this.buyData({ serviceId, phoneNumber: phone, amount, planCode });
        } else {
            throw new VtuGateError(`VTU Gate purchase does not support ${type} in this adapter`);
        }

        const data = response.data || {};
        return {
            provider: "vtugate",
            providerRequestId: String(data.transaction_id || reference),
            providerReference: String(data.external_reference || data.transaction_id || reference),
            message: response.message || "Transaction successful"
        };
    }
}

const defaultProvider = new VtuGateProvider();

module.exports = {
    VtuGateError,
    VtuGateProvider,
    accountDetails: (...args) => defaultProvider.accountDetails(...args),
    transactionStatus: (...args) => defaultProvider.transactionStatus(...args),
    transactionHistory: (...args) => defaultProvider.transactionHistory(...args),
    fetchServices: (...args) => defaultProvider.fetchServices(...args),
    fetchAllServices: (...args) => defaultProvider.fetchAllServices(...args),
    buyAirtime: (...args) => defaultProvider.buyAirtime(...args),
    buyBulkAirtime: (...args) => defaultProvider.buyBulkAirtime(...args),
    fetchDataPlans: (...args) => defaultProvider.fetchDataPlans(...args),
    buyData: (...args) => defaultProvider.buyData(...args),
    verifyCableTv: (...args) => defaultProvider.verifyCableTv(...args),
    buyCableTv: (...args) => defaultProvider.buyCableTv(...args),
    verifyElectricity: (...args) => defaultProvider.verifyElectricity(...args),
    buyElectricity: (...args) => defaultProvider.buyElectricity(...args),
    getEducationTypePrice: (...args) => defaultProvider.getEducationTypePrice(...args),
    buyEducation: (...args) => defaultProvider.buyEducation(...args),
    registerSenderId: (...args) => defaultProvider.registerSenderId(...args),
    listSenderIds: (...args) => defaultProvider.listSenderIds(...args),
    sendSms: (...args) => defaultProvider.sendSms(...args),
    sendBulkSms: (...args) => defaultProvider.sendBulkSms(...args),
    smsHistory: (...args) => defaultProvider.smsHistory(...args),
    fetchCountries: (...args) => defaultProvider.fetchCountries(...args),
    fetchOperators: (...args) => defaultProvider.fetchOperators(...args),
    detectOperator: (...args) => defaultProvider.detectOperator(...args),
    previewFxRate: (...args) => defaultProvider.previewFxRate(...args),
    buyInternationalTopup: (...args) => defaultProvider.buyInternationalTopup(...args),
    internationalTopupStatus: (...args) => defaultProvider.internationalTopupStatus(...args),
    internationalTopupHistory: (...args) => defaultProvider.internationalTopupHistory(...args),
    purchase: (...args) => defaultProvider.purchase(...args)
};
