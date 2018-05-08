import React from "react";
import Dialog from "material-ui/Dialog";
import Button from "material-ui/Button";
import strings from "../../localizeStrings";
import CreationDialogStepper from "./CreationDialogStepper";

const getDialogActions = (props, handleCancel, handleBack, handleNext, handleSubmit) => {
  const { numberOfSteps, currentStep = 0, steps, editMode } = props;

  const isLastStep = currentStep === numberOfSteps - 1;
  const isFirstStep = currentStep === 0;
  const requiredInfoAdded = steps[currentStep].nextDisabled;

  const cancelButton = (
    <Button aria-label="cancel" secondary={true} onTouchTap={() => handleCancel(props)}>
      {strings.common.cancel}
    </Button>
  );
  const backButton =
    numberOfSteps > 1 ? (
      <Button aria-label="back" primary={true} disabled={isFirstStep} onTouchTap={() => handleBack(props)}>
        {strings.common.back}
      </Button>
    ) : null;
  const nextButton =
    numberOfSteps > 1 ? (
      <Button
        aria-label="next"
        primary={true}
        disabled={isLastStep ? isLastStep : requiredInfoAdded}
        onTouchTap={() => handleNext(props)}
      >
        {strings.common.next}
      </Button>
    ) : null;
  const submitButton = (
    <Button
      aria-label="submit"
      primary={true}
      disabled={isLastStep ? requiredInfoAdded : !editMode}
      onTouchTap={() => handleSubmit(props)}
    >
      {strings.common.submit}
    </Button>
  );

  const leftActions = (
    <div>
      {cancelButton}
      {backButton}
    </div>
  );
  const rightActions = (
    <div>
      {nextButton}
      {submitButton}
    </div>
  );

  return [leftActions, rightActions];
};

const handleCancel = props => {
  props.onDialogCancel();
};

const handleBack = props => props.setCurrentStep(props.currentStep - 1);
const handleNext = props => props.setCurrentStep(props.currentStep + 1);

const CreationDialog = props => {
  const { creationDialogShown, title, handleSubmit } = props;
  return (
    <Dialog
      open={creationDialogShown}
      title={title}
      modal={true}
      autoScrollBodyContent={true}
      bodyStyle={{
        minHeight: "200px"
      }}
      contentStyle={{
        width: "55%",
        maxWidth: "none"
      }}
      actionsContainerStyle={{
        display: "flex",
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between"
      }}
      actions={getDialogActions(props, handleCancel, handleBack, handleNext, handleSubmit)}
    >
      <CreationDialogStepper {...props} />
    </Dialog>
  );
};

export default CreationDialog;
