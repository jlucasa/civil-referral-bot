# `civil-referral-bot`

## Summary

This repository contains code snippets necessary to automate transfer of data between the Mailchimp account for Civil and a Google Sheet which keeps track of subscriber referral count. This integrates with Google Apps Scripts in order to complete the full referral program.

## How the System Works

This system can currently handle the following abilities, which are self-descriptive:

* `handleNewSubscriber`
* `handleNewUnsubscriber`
* `handleUpdatedSubscriber`

Documentation for these can be found on this page.

## Platforms and APIs in Use

The code in this repository is deployed to **Google Cloud Platform** using serverless **Cloud Functions**.

These cloud functions have endpoints which connect to **Mailchimp's webhook functions**, where each webhook function has the expected behavioral trigger.

Each cloud function utilizes a **service account** with Edit Access to the Civil Referral Hub Google Sheet, using an **API key** with full access to the Google Sheets API.

### Example

`handleNewSubscriber` is marked as the entry point of a cloud function with an endpoint listed as a Mailchimp webhook, which only fires when a new subscriber is posted.

## Testing

In order to test this system, the following steps should be performed. Ideally, they would be performed in the following order, to promote reuse of testing assets (i.e. e-mail addresses):

* `handleNewSubscriber`:
    * Subscribe to Civil Media using a new e-mail address
    * Go to "Testing Sheet" in the Civil Referral Hub Google Sheet
    * Ensure that the corresponding data has been appended to the end of the sheet
* `handleUpdatedSubscriber`:
    * Refer a new e-mail address to subscribe to Civil Media using the newly-subscribed e-mail address from `handleNewSubscriber`
    * Go to "Testing Sheet" in the Civil Referral Hub Google Sheet
    * The e-mail address from `handleNewSubscriber` should now have an updated referral count.
    * The referred e-mail address should also be appended to the sheet (through `handleNewSubscriber`).
    * The create date should not be the same as the update date.
    * **Note:** This function will fire for any subscriber updates (for instance, e-mail address changes).
* `handleNewUnsubscriber`:
    * Unsubscribe the e-mail address originally subscribed through `handleNewSubscriber`
    * Go to "Testing Sheet" in the Civil Referral Hub Google Sheet
    * The row which corresponds to that e-mail address should now be removed, **and no blank row should be in its place.**

## TODO

* Need to be able to handle cleaned subscribers, as requested for full functionality
* Testing needs to be discussed. Some tests are harder to pull off than others (i.e. `handleUpdatedSubscriber`).