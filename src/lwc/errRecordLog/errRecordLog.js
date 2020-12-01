import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { constructErrorMessage, extractFieldInfo, isNull, isUndefined, format } from 'c/utilCommon';
import getData from '@salesforce/apex/ERR_Log_CTRL.getData';

import loadingMessage from '@salesforce/label/c.labelMessageLoading';
import insufficientPermissions from '@salesforce/label/c.commonInsufficientPermissions';
import contactSystemAdmin from '@salesforce/label/c.commonContactSystemAdminMessage';
import commonUnknownError from '@salesforce/label/c.commonUnknownError';
import commonNoItems from '@salesforce/label/c.commonNoItems';
import actionView from '@salesforce/label/c.bgeActionView';
import listViewItemCount from '@salesforce/label/c.geTextListViewItemCount';
import listViewItemCountPlural from '@salesforce/label/c.geTextListViewItemsCount';
import listViewSortedBy from '@salesforce/label/c.geTextListViewSortedBy';

import ERROR_OBJECT from '@salesforce/schema/Error__c';
import ERROR_FIELD_DATETIME from '@salesforce/schema/Error__c.Datetime__c';
import ERROR_FIELD_ERROR_TYPE from '@salesforce/schema/Error__c.Error_Type__c';
import ERROR_FIELD_FULL_MESSAGE from '@salesforce/schema/Error__c.Full_Message__c';

const ASC = "asc";
const DESC = "desc";

export default class errRecordLog extends NavigationMixin(LightningElement) {

    labels = Object.freeze({
        loadingMessage,
        insufficientPermissions,
        contactSystemAdmin,
        commonUnknownError,
        commonNoItems,
        actionView,
        listViewItemCount,
        listViewItemCountPlural,
        listViewSortedBy
    });

    @api recordId;

    @track isLoading = true;
    @track error = {};

    @track recordInfo = {};
    @track columns = [];
    @track data;
    @track hasData = true;
    @track sortedBy;
    @track sortDirection = DESC;
    fieldDatetime = {};


    /***
     * @description Initializes the component
     */
    connectedCallback() {
        if (this.recordId) {
            getData({ recordId: this.recordId })
                .then(response => {
                    this.recordInfo = {
                        sObjectType: response.sObjectType,
                        sObjectTypeLabelPlural: response.sObjectTypeLabelPlural,
                        name: response.recordName
                    };

                    this.data = response.data;
                    this.hasData = !isUndefined(this.data) && this.data.length > 0;
                })
                .catch((error) => {
                    this.handleError(error);
                })
                .finally(() => {
                    this.checkLoading();
                });
        }
    }

    /***
    * @description Retrieves Error SObject info and its field labels/help text
    */
    @wire(getObjectInfo, { objectApiName: ERROR_OBJECT.objectApiName })
    wiredErrorObjectInfo(response) {
        if (response.data) {
            const fields = response.data.fields;

            this.fieldDatetime = extractFieldInfo(fields, ERROR_FIELD_DATETIME.fieldApiName);
            const fieldErrorType = extractFieldInfo(fields, ERROR_FIELD_ERROR_TYPE.fieldApiName);
            const fieldFullMessage = extractFieldInfo(fields, ERROR_FIELD_FULL_MESSAGE.fieldApiName);

            this.columns = [
                {
                    label: this.fieldDatetime.label,
                    fieldName: this.fieldDatetime.apiName,
                    type: 'date',
                    typeAttributes: {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    },
                    hideDefaultActions: true,
                    sortable: true
                },
                {
                    label: fieldErrorType.label,
                    fieldName: fieldErrorType.apiName,
                    type: fieldErrorType.dataType,
                    hideDefaultActions: true
                },
                {
                    label: fieldFullMessage.label,
                    fieldName: fieldFullMessage.apiName,
                    type: fieldFullMessage.dataType,
                    wrapText: true
                },
                {
                    type: 'action',
                    typeAttributes: {
                        rowActions: [{ label: this.labels.actionView, name: 'show_details' }],
                    }
                }
            ];

            this.checkLoading();
        }

        if (response.error) {
            this.handleError(response.error);
        }
    }


    /**
     * @description Checks if the form still has outstanding data to load
     */
    checkLoading() {
        const waitingForData = isUndefined(this.data) || isNull(this.data);
        const waitingForObjectInfo = this.columns.length === 0;

        this.isLoading = waitingForData || waitingForObjectInfo;
    }

    /**
     * @description Navigates to the record detail page
     */
    navigateToRecordViewPage(event) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                actionName: 'view'
            }
        });
    }

    /**
     * @description Navigates to the record tab
     */
    navigateToRecordObjectPage(event) {
        this[NavigationMixin.Navigate]({
            type: "standard__objectPage",
            attributes: {
                objectApiName: this.recordInfo.sObjectType,
                actionName: "list",
            }
        });
    }

    /**
     * @description Navigates to the error log detail page
     */
    handleRowAction(event) {
        const row = event.detail.row;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: row.Id,
                actionName: 'view'
            }
        });
    }

    /**
     * @description Sorts records by the sort direction and sorted field
     */
    handleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const sorted = [...this.data];

        sorted.sort(this.sortBy(sortedBy, sortDirection === ASC ? 1 : -1));

        this.data = sorted;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

    sortBy(field, reverse, primer) {
        const key = primer
            ? function (x) {
                return primer(x[field]);
            }
            : function (x) {
                return x[field];
            };

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    /***
    * @description Returns total number of logs
    */
    get itemSummary() {
        const size = this.data ? this.data.length : 0;

        return size !== 1
            ? format(this.labels.listViewItemCountPlural, [size])
            : format(this.labels.listViewItemCount, [size]);
    }

    /***
    * @description Returns info about sorted by field which is Datetime field only
    */
    get sortedByLabel() {
        return this.fieldDatetime.label
            ? format(this.labels.listViewSortedBy, [this.fieldDatetime.label])
            : undefined;
    }

    /***
    * @description Handles error construction and its display
    * @param error: Error Event
    */
    handleError(error) {
        this.error = (error && error.detail)
            ? error
            : constructErrorMessage(error);

        if (this.error.detail && this.error.detail.includes('ERR_Log_CTRL')) {
            this.error.header = this.labels.insufficientPermissions;
            this.isLoading = false;
        }
    }


    /***
    * @description data-qa-locator values for elements on the component
    */
    get qaLocatorSpinner() {
        return `spinner ${this.labels.loadingMessage}`;
    }

    get qaLocatorDatatable() {
        return `datatable Logs`;
    }

    get qaLocatorSummary() {
        return `text Summary`;
    }

    get qaLocatorNoItemsMessage() {
        return `text No Items Message`;
    }
}