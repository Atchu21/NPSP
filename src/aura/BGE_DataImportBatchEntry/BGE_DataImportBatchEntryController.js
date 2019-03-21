({
    /**
     * @description: instantiates component. Only called when component is first loaded.
     */
    doInit: function (component, event, helper) {
        helper.getModel(component);
    },

    /**
     * @description: handles selected row action in the datatable. Current option list: delete.
     */
    handleRowAction: function (component, event, helper) {
        let rowAction = event.getParam('action');
        var row = event.getParam('row');
        switch (rowAction.name) {
            case 'delete':
                helper.handleDeleteRowAction(component, row);
                break;
            case 'view':
                helper.handleViewRowAction(component, row);
                break;
        }
    },

    /**
     * @description: handles ltng:sendMessage from child component
     */
    handleMessage: function (component, event, helper) {
        let message = event.getParam('message');
        let channel = event.getParam('channel');
        let info;

        if (message) {
            if (message.batchId !== component.get('v.recordId')) {
                return;
            }
            info = message.info || message;
        }

        if (channel === 'onSuccess') {
            helper.runNewRecordDryRun(component, info.recordId);
            helper.showToast(component, $A.get('$Label.c.PageMessagesConfirm'), $A.get('$Label.c.bgeGridGiftSaved'), 'success');
            helper.createEntryForm(component);
        } else if (channel === 'onCancel') {
            helper.createEntryForm(component);
        } else if (channel === 'setDonorType') {
            component.set('v.donorType', info.donorType);
        } else if (channel === 'hideFormSpinner') {
            helper.hideFormSpinner(component);
        } else if (channel === 'showFormSpinner') {
            helper.showFormSpinner(component);
        } else if (channel === 'onError') {
            helper.showToast(component, info.title, info.errorMessage, 'error');
        }
    },

    /**
     * @description: cell change handler for lightning:dataTable
     * Saves updated cell value and re-runs Dry Run on that row.
     */
    onCellChange: function (component, event, helper) {
        var values = event.getParam('draftValues');
        //cells only change one at a time, so pop the value out of the array
        let changedValue = values[0];
        // validation would happen here
        helper.handleRowEdit(component, changedValue);
        component.find('dataImportRowsDataTable').set('v.draftValues', null);
    },

    /**
     * @description: checks that user has all necessary permissions and then launches modal or displays error
     */
    onEditClick: function(component, event, helper) {
        let openBatchWizard = function () {
            helper.openBatchWizard(component);
        }

        let handleApexErrors = function (errors) {
            helper.handleApexErrors(component, errors);
        }

        let apexMethodName = 'c.checkFieldPermissions';
        let param = { batchId: component.get('v.recordId') };

        let checkFieldPermissionsPromise = helper.callApex(component, apexMethodName, param);

        checkFieldPermissionsPromise
            .then(
                $A.getCallback(function (result) {
                    openBatchWizard();
                })
            )
            .catch(
                $A.getCallback(function (errors) {
                    handleApexErrors(errors);
                })
            )
    },

    /**
     * @description: handles infinite scroll for the Data Import records datatable
     */
    onLoadMore: function (component, event, helper) {
        event.getSource().set('v.isLoading', true);
        let totals = component.get('v.totals');
        let totalCountGifts = totals.countGifts ? totals.countGifts : 0;
        const countLoadedGifts = component.get('v.data').length;
        if (countLoadedGifts >= totalCountGifts) {
            event.getSource().set('v.enableInfiniteLoading', false);
            event.getSource().set('v.isLoading', false);
        } else {
            helper.getDataImportRows(component, event);
        }
    },

    /**
     * @description: called when the 'Process Batch' button is clicked
     */
    processBatch: function (component, event, helper) {
        helper.processBatch(component);
    },

    /**
     * @description: called when the 'Batch Dry Run' button is clicked
     */
    batchDryRunClick: function(component, event, helper) {
        helper.showSpinner(component);
        helper.showFormSpinner(component);
        helper.batchDryRun(component);
    }

})