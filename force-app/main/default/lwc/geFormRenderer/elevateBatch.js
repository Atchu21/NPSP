import apexAddToElevateBatch from '@salesforce/apex/GE_GiftEntryController.addToElevateBatch';
import apexCreateElevateBatch from '@salesforce/apex/GE_GiftEntryController.createElevateBatch';
import apexRemoveFromElevateBatch from '@salesforce/apex/GE_GiftEntryController.removeFromElevateBatch';


class ElevateBatch {

    constructor() {
        this.elevateBatchId = null;
        console.log('inside ElevateBatch constructor');
    }
    
    async add(tokenizedGift) {
        console.log('inside add()');
        return await this.performAdd(tokenizedGift, true);
    }

    async performAdd(tokenizedGift, retryOnFailure) {
        try {
            if (!this.elevateBatchId) {
                this.elevateBatchId = await this.create();
            }

            const authorizedGift = await apexAddToElevateBatch(
                {tokenizedGift: tokenizedGift, elevateBatchId: this.elevateBatchId}
            );

            return authorizedGift;
        } catch (exception) {
            if (retryOnFailure) {
                this.elevateBatchId = await this.create();
                return await this.performAdd(tokenizedGift, false);
            } else {
                throw(exception);
            }
        }
    }

    async create() {
        const elevateBatch = await apexCreateElevateBatch();
        return elevateBatch.elevateBatchId;
    }

    async remove(authorizedGift) {
        console.log('in remove');
        console.log(`authorized gift = ${JSON.stringify(authorizedGift)}`);

        return await apexRemoveFromElevateBatch({
            authorizedGift: authorizedGift
        });
    }
}

export default ElevateBatch;