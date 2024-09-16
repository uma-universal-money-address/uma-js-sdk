export class UmaUnsupportedError extends Error {
    constructor(message: string = 'UMA Auth is not supported by this wallet') {
        super(message);
        this.name = 'UmaUnsupportedError';
    }
}

