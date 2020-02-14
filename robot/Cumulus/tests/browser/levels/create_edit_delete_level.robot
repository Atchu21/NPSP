*** Settings ***

Resource        robot/Cumulus/resources/NPSP.robot
Library         cumulusci.robotframework.PageObjects
...             robot/Cumulus/resources/ContactPageObject.py
...             robot/Cumulus/resources/LevelsPageObject.py
...             robot/Cumulus/resources/NPSPSettingsPageObject.py
Suite Setup     Open Test Browser
Suite Teardown  Delete Records and Close Browser


*** Variables ***
&{contact_fields}           Email=test@example.com
&{text_fields}              Level Name=AutomationLevel    Minimum Amount=0.1  Maximum Amount=0.9
&{dropdown_fields}          Target=Contact    Source Field=Total Gifts  Level Field=Level   Previous Level Field=Previous Level
&{text_fields_edit}         Minimum Amount=0.01  Maximum Amount=0.99
&{dropdown_fields_edit}     Source Field=Smallest Gift


*** Test Cases ***

Create and edit level to verify fields
    [Documentation]                      Create a level and verify the fields on the created level details page
    ...                                  Edit the level details and update the fields. Verify the updated fields
    ...                                  are persisted on the details page.
    [tags]                               W-038641                 feature:Levels


    Go To Page                                          Home                      Level__c
    Populate Values To Create Level                     ${text_fields}            ${dropdown_fields}

    Wait For Locator                                    obj-header                Level
    ${level_id} =                                       Save Current Record ID For Deletion  Level__c
    Set Global Variable                                 ${level_id}
    Go To Page                                          Details
    ...                                                 Level__c
    ...                                                 object_id=${level_id}

    Wait Until Loading Is Complete
    Navigate To And Validate Field Value                Minimum Amount (>\=)    contains    0.10
    Navigate To And Validate Field Value                Maximum Amount (<)      contains    0.90
    Click Link                                          link=Show more actions
    Click Link                                          link=Edit
    Populate Values To Create Level                     ${text_fields_edit}    ${dropdown_fields_edit}
    Go To Page                                          Details
    ...                                                 Level__c
    ...                                                 object_id=${level_id}

    Wait Until Loading Is Complete
    Navigate To And Validate Field Value                Maximum Amount (<)     contains       0.99
    Navigate To And Validate Field Value                Source Field           contains       npo02__SmallestAmount__c

2 Validate Level Assignment in Batch Job
    [Documentation]                      Create a contact, edit the smallgift field value to apply a valid
    ...                                  level by running the batch process

    [tags]                                  W-038641                 feature:Level
    # --------------------------------
    # Modify the SmallestGift field to allow the level to be applied
    # --------------------------------
    Setupdata                               contact                     contact_data=${contact_fields}
    Set Global Variable                     ${data}
    Go To Page                              Details
    ...                                     Contact
    ...                                     object_id=${data}[contact][Id]

    Scroll Element Into View                text:Donation Totals
    Click Button                            title:Edit Smallest Gift
    Wait For Locator                        record.edit_form
    Populate Field                          Smallest Gift                 0.75
    Click Record Button                     Save
    Wait Until Loading Is Complete

    Navigate To And Validate Field Value    Smallest Gift    contains    $0.75
    # --------------------------------
    # Open NPSP Settings and run the Levels batch job
    # --------------------------------
    Open NPSP Settings                      Bulk Data Processes         Level Assignment Batch
    Click Settings Button                   idPanelLvlAssignBatch       Run Batch
    Wait for Locator                        npsp_settings.completed
    # --------------------------------
    # Return to the Contact to validate the updated Level field
    # --------------------------------
    Go To Page                              Details
    ...                                     Contact
    ...                                     object_id=${data}[contact][Id]
    Navigate To And Validate Field Value    Level    contains          AutomationLevel

3. Delete a Level
    [Documentation]                        Delete the Level from the level details page using more actions
    ...                                    Verify that the level gets disassociated with the contact
    [tags]                                  W-038641                 feature:Level

    Go To Page                              Details
    ...                                     Level__c
    ...                                     object_id=${level_id}
    Click Show More Actions Button          Delete
    Click Modal Button                      Delete
    Go To Page                              Details
    ...                                     Contact
    ...                                     object_id=${data}[contact][Id]
    Navigate To And Validate Field Value    Level      does not contain    AutomationLevel    section=Donation Totals

