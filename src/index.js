import CanvasForm from "./CanvasForm";
import * as apis from "./apis";

CanvasForm.prototype.getVersion = () => "v0.0.1";

for (let key in apis) {
  CanvasForm.prototype[key] = apis[key];
}

window.CanvasForm = CanvasForm;

export default CanvasForm;
