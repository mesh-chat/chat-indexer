import { near, BigInt, log, json } from "@graphprotocol/graph-ts"
import { Contact, Message } from "../generated/schema"

export function handleReceipt(
    receiptWithOutcome: near.ReceiptWithOutcome
): void {
  const actions = receiptWithOutcome.receipt.actions;
  for (let i = 0; i < actions.length; i++) {
    if (actions[i].kind != near.ActionKind.FUNCTION_CALL) {
      continue
    }
    const functionCall = actions[i].toFunctionCall();
    if (functionCall.methodName == "register_account")
      handleRegisterAccount(actions[i], receiptWithOutcome)
    else if (functionCall.methodName == "send_message")
      handleSendMessage(actions[i], receiptWithOutcome)
    else
      log.info("handleReceipt: Invalid method name: {}", [functionCall.methodName])
  }
}

function handleRegisterAccount(
    action: near.ActionValue,
    receiptWithOutcome: near.ReceiptWithOutcome
): void {
  const functionCall = action.toFunctionCall();
  const args = json.fromString(functionCall.args.toString()).toObject();
  const accountId = receiptWithOutcome.receipt.signerId;
  const phoneNumber = args.get("phone_number")!.toString();
  const contact = new Contact(phoneNumber);
  contact.account_id = accountId;
  contact.save();
}

function handleSendMessage(
    action: near.ActionValue,
    receiptWithOutcome: near.ReceiptWithOutcome
): void {
  const functionCall = action.toFunctionCall();
  const args = json.fromString(functionCall.args.toString()).toObject();
  const senderPhoneNumber = args.get("sender_phone_number")!.toString();
  const receiverPhoneNumber = args.get("receiver_phone_number")!.toString();
  const message = args.get("message")!.toString();
  const senderContact = Contact.load(senderPhoneNumber);
  if (senderContact == null) {
    log.error("handleSendMessage: Invalid sender: {}", [senderPhoneNumber]);
    return;
  }
  const receiverContact = Contact.load(receiverPhoneNumber);
  if (receiverContact == null) {
    log.error("handleSendMessage: Invalid receiver: {}", [senderPhoneNumber]);
    return;
  }
  const messageEntity = new Message(senderPhoneNumber + receiverPhoneNumber + receiptWithOutcome.receipt.id.toString());
  messageEntity.from = senderContact.id;
  messageEntity.to = receiverContact.id;
  messageEntity.message_text = message;
  messageEntity.timestamp = BigInt.fromI64(receiptWithOutcome.block.header.timestampNanosec);
  messageEntity.save();
}
