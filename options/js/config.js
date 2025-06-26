import { getSync, setSync } from "../../popup/js/constant.js";

const keys = ["showInlineAttachmentOn", "fileNameFormat", "dateFormat"];
const storeData = await getSync(keys);
const inlineAttachmentSwitch = eId("toggle_inline_attachment");
inlineAttachmentSwitch.checked = storeData.hightlightOn;
$on(inlineAttachmentSwitch, "change", ({ target }) => {
	setSync({ showInlineAttachmentOn: target.checked });
});

//Clip article filename format
const filenameFormatSelect = eId("filename-format");
filenameFormatSelect.value = storeData.fileNameFormat;
$on(filenameFormatSelect, "change", () => setSync({ fileNameFormat: filenameFormatSelect.value }));

const dateFormatSelect = eId("dateFormat");
dateFormatSelect.value = storeData.dateFormat;
$on(dateFormatSelect, "change", () => setSync({ dateFormat: dateFormatSelect.value }));
