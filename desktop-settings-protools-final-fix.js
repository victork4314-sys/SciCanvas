(() => {
  if (window.__figureLoomDesktopSettingsProToolsFinalFixV2) return;
  window.__figureLoomDesktopSettingsProToolsFinalFixV2 = true;

  const DESKTOP = 'html[data-figureloom-device-class="desktop"] body';
  const style = document.createElement('style');
  style.id = 'figureloomDesktopSettingsProToolsFinalFixStyle';
  style.textContent = `
    /* Desktop only: Settings is a normal top-category tab, not a separate bold command. */
    ${DESKTOP} #settingsRibbonButton#settingsRibbonButton{
      display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;
      box-sizing:border-box!important;width:auto!important;min-width:0!important;height:29px!important;min-height:29px!important;max-height:29px!important;
      margin:0!important;padding:0 9px!important;border:0!important;border-bottom:3px solid transparent!important;border-radius:0!important;
      background:transparent!important;color:var(--figureloom-ui-muted,#60706c)!important;font-size:9px!important;font-weight:500!important;
      line-height:1!important;text-align:center!important;white-space:nowrap!important;transform:none!important;top:auto!important;
    }
    ${DESKTOP} #settingsRibbonButton#settingsRibbonButton::before{content:none!important;display:none!important}
    ${DESKTOP}.figureloom-settings-open #settingsRibbonButton#settingsRibbonButton,
    ${DESKTOP} #settingsRibbonButton#settingsRibbonButton.active{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-bottom-color:var(--figureloom-ui-accent,#2f7468)!important;font-weight:650!important;
    }

    /* Desktop only: Settings internals use the compact inspector/tool scale. */
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage{font-size:9px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-topbar{min-height:44px!important;padding:7px 12px!important;gap:9px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-topbar h1{font-size:14px!important;line-height:1.15!important;letter-spacing:-.01em!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-topbar p{margin-top:2px!important;font-size:8px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-close{width:28px!important;min-width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;border-radius:7px!important;font-size:17px!important;line-height:1!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-layout{grid-template-columns:164px minmax(0,1fr)!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-navigation{gap:3px!important;padding:7px 6px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-navigation button{grid-template-columns:19px minmax(0,1fr)!important;gap:6px!important;height:30px!important;min-height:30px!important;padding:4px 7px!important;border-radius:7px!important;font-size:9px!important;line-height:1.1!important;font-weight:600!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-navigation button>span:first-child{width:18px!important;height:18px!important;font-size:11px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-navigation button svg{width:13px!important;height:13px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-content{padding:12px 16px 18px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-panel{max-width:650px!important;margin:0 auto!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-section-heading{margin-bottom:8px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-subheading{margin-top:12px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-section-heading h2{font-size:12px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-section-heading p{margin-top:2px!important;font-size:8px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-choice-grid{gap:5px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice,.settings-toggle-row){gap:7px!important;padding:7px!important;border-radius:7px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice,.settings-toggle-row) strong{font-size:9.5px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice,.settings-toggle-row) small{margin-top:2px!important;font-size:8px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice input,.settings-toggle-row input){width:13px!important;height:13px!important;margin-top:1px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-select-row,.settings-language-picker){gap:9px!important;padding:7px!important;border-radius:7px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-select-row select,.settings-language-picker select){width:auto!important;min-width:165px!important;max-width:260px!important;height:28px!important;min-height:28px!important;padding:3px 6px!important;border-radius:6px!important;font-size:9px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-footer{min-height:36px!important;padding:5px 12px!important;font-size:8px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-footer button{height:28px!important;min-height:28px!important;padding:0 8px!important;border-radius:6px!important;font-size:9px!important}

    /* Desktop only: Help is a true circle and cannot be squeezed by adjacent actions. */
    ${DESKTOP} .title-actions #tourHelpButton#tourHelpButton{display:grid!important;place-items:center!important;flex:0 0 28px!important;inline-size:28px!important;block-size:28px!important;width:28px!important;min-width:28px!important;max-width:28px!important;height:28px!important;min-height:28px!important;max-height:28px!important;margin:0!important;padding:0!important;border-radius:50%!important;aspect-ratio:1/1!important;font-size:13px!important;font-weight:700!important;line-height:1!important;overflow:hidden!important;transform:none!important}
    ${DESKTOP} .title-actions #tourHelpButton#tourHelpButton>:where(span,svg,img){display:block!important;width:auto!important;max-width:14px!important;height:auto!important;max-height:14px!important;object-fit:contain!important}

    /* Desktop only: Projects ribbon internals match Text / Shapes / Draw / Fonts controls. */
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost{align-items:center!important;gap:8px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .tool-group{align-items:center!important;gap:6px!important;padding:0 10px 11px 0!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .tool-group-label{bottom:-1px!important;font-size:8px!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-main-actions button{display:inline-flex!important;grid-template-columns:none!important;align-items:center!important;justify-content:center!important;gap:4px!important;min-width:54px!important;height:28px!important;min-height:28px!important;max-height:28px!important;padding:0 7px!important;border-radius:6px!important;font-size:9px!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-main-actions button strong{font-size:11px!important;font-weight:500!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-main-actions button span{display:inline!important;font-size:9px!important;font-weight:600!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-list{gap:4px!important;padding:0 1px 2px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-chip{flex-basis:145px!important;min-width:86px!important;max-width:145px!important;height:28px!important;min-height:28px!important;max-height:28px!important;gap:5px!important;padding:0 7px!important;border-radius:6px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-chip i{width:6px!important;height:6px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-chip span{font-size:8.5px!important;font-weight:600!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-empty{font-size:8px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group{max-width:350px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-copy{min-width:96px!important;max-width:150px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-copy strong{font-size:9px!important;line-height:1.15!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-copy small{margin-top:2px!important;font-size:7.5px!important;line-height:1.15!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group>button{height:28px!important;min-height:28px!important;max-height:28px!important;padding:0 7px!important;border-radius:6px!important;font-size:8.5px!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="window"],
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="close"]{flex:0 0 28px!important;width:28px!important;min-width:28px!important;max-width:28px!important;padding:0!important;font-size:13px!important}

    /* Desktop only: Insert uses the same compact drawer and inspector scale as Pro Tools. */
    ${DESKTOP} #insertDrawer#insertDrawer{width:min(460px,calc(100vw - 48px))!important;max-width:min(460px,calc(100vw - 48px))!important;top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important}
    ${DESKTOP} #insertDrawer#insertDrawer .utility-head{min-height:42px!important;padding:7px 9px!important;gap:8px!important}
    ${DESKTOP} #insertDrawer#insertDrawer .utility-head strong{font-size:11px!important;line-height:1.2!important}
    ${DESKTOP} #insertDrawer#insertDrawer .utility-head span{margin-top:1px!important;font-size:8px!important;line-height:1.25!important}
    ${DESKTOP} #insertDrawer#insertDrawer .utility-head button{width:26px!important;min-width:26px!important;height:26px!important;min-height:26px!important;padding:0!important;border-radius:6px!important;font-size:17px!important;line-height:1!important}
    ${DESKTOP} #insertDrawer#insertDrawer .utility-body{padding:9px!important;overflow:auto!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-section{margin-bottom:9px!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-section h3{margin:0 0 5px!important;font-size:9px!important;line-height:1.2!important;letter-spacing:.04em!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-action{min-width:0!important;min-height:38px!important;height:auto!important;align-content:center!important;gap:2px!important;padding:6px 8px!important;border-radius:7px!important;font-size:9px!important;line-height:1.2!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-action strong{font-size:9.5px!important;line-height:1.2!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-action small{font-size:8px!important;line-height:1.25!important}
    ${DESKTOP} #insertDrawer#insertDrawer .tool-note{margin:6px 0 0!important;font-size:8px!important;line-height:1.3!important}

    /* Desktop only: Loomy/Gemini text and controls use the same scale as the inspector. */
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer{width:min(460px,calc(100vw - 48px))!important;max-width:min(460px,calc(100vw - 48px))!important;top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .utility-head{min-height:42px!important;padding:7px 9px!important;gap:8px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .utility-head strong{font-size:11px!important;line-height:1.2!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .utility-head span{margin-top:1px!important;font-size:8px!important;line-height:1.25!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .utility-head button{width:26px!important;min-width:26px!important;height:26px!important;min-height:26px!important;padding:0!important;border-radius:6px!important;font-size:17px!important;line-height:1!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-topbar{gap:6px!important;padding:7px 8px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-sources{gap:4px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-source{height:27px!important;min-height:27px!important;padding:0 8px!important;border-radius:999px!important;font-size:8.5px!important;font-weight:650!important;line-height:1!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-access{font-size:7.5px!important;line-height:1.2!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-messages{padding:9px 8px!important;gap:7px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-message>small{font-size:7px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-bubble{padding:7px 9px!important;border-radius:11px 11px 11px 4px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-bubble p{font-size:9px!important;line-height:1.35!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer{padding:8px!important;max-height:46vh!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-action{gap:3px!important;margin-bottom:5px!important;font-size:8px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-action select,
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer>textarea{font-family:inherit!important;font-size:9px!important;line-height:1.3!important;padding:6px 7px!important;border-radius:7px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer>textarea{min-height:62px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer>textarea::placeholder{font-size:9px!important;font-weight:400!important;opacity:.75!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-details{margin-top:5px!important;padding:6px 7px!important;border-radius:7px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-details summary{font-size:8px!important;font-weight:650!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer :where(.figureloom-chat-key-label,.figureloom-chat-remember,.figureloom-chat-help,.figureloom-chat-safety){font-size:8px!important;line-height:1.3!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer :where(.figureloom-chat-key-field input,.figureloom-chat-key-field button,.figureloom-chat-help-button){min-height:28px!important;padding:5px 7px!important;border-radius:6px!important;font-size:8.5px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-sendrow{gap:5px!important;margin-top:6px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-sendrow button{min-height:30px!important;height:30px!important;padding:0 8px!important;border-radius:7px!important;font-size:8.5px!important;line-height:1!important}

    /* Pro Tools remains the approved desktop reference component. */
    ${DESKTOP} #proToolsDrawer#proToolsDrawer{width:min(460px,calc(100vw - 48px))!important;max-width:min(460px,calc(100vw - 48px))!important;top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head{padding:9px 11px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head strong{font-size:11px!important;line-height:1.25!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head span{margin-top:2px!important;font-size:8.5px!important;line-height:1.35!important;white-space:normal!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head button{width:26px!important;min-width:26px!important;height:26px!important;min-height:26px!important;padding:0!important;font-size:18px!important;line-height:1!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-body{min-height:0!important;padding:9px!important;overflow:auto!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-intro{margin:0 0 8px!important;font-size:9px!important;line-height:1.4!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-grid{grid-template-columns:minmax(0,1fr)!important;gap:6px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card{box-sizing:border-box!important;grid-template-columns:28px minmax(0,1fr) 13px!important;align-items:center!important;gap:8px!important;width:100%!important;min-width:0!important;min-height:0!important;height:auto!important;padding:8px 9px!important;border-radius:8px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card>span:nth-child(2){min-width:0!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-icon{display:grid!important;place-items:center!important;box-sizing:border-box!important;flex:0 0 28px!important;width:28px!important;min-width:28px!important;max-width:28px!important;height:28px!important;min-height:28px!important;max-height:28px!important;aspect-ratio:1/1!important;border-radius:7px!important;font-size:14px!important;line-height:1!important;transform:none!important;overflow:hidden!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card[data-workspace="code"] .pro-workspace-icon{font-size:10px!important;letter-spacing:-.4px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card strong{display:block!important;font-size:10px!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:break-word!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card small{display:block!important;margin-top:2px!important;font-size:8px!important;line-height:1.35!important;white-space:normal!important;overflow-wrap:break-word!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-open-arrow{font-size:17px!important;line-height:1!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-shortcuts{margin-top:8px!important;padding:7px!important;border-radius:7px!important}
  `;

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);
})();
