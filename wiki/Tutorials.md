# Complete tutorials

These tutorials use the normal FigureLoom editor and can be followed on Desktop, Tablet, or Phone.

Before a large tutorial, create a new project and download a backup after the first major milestone.

# Tutorial 1: Create an editable scientific pathway

## Plan the pathway

Write down:

- Starting signal
- Receptor or first process
- Intermediate stages
- Final response
- Activating relationships
- Inhibitory relationships
- Compartments

Keep the first version small. A six-stage pathway is easier to clean up than a twenty-stage pathway created all at once.

## Set up the page

1. Create a new project.
2. Name it `Signaling pathway tutorial`.
3. Choose a wide screen or presentation page.
4. Turn on the grid and snapping.
5. Choose a light background with strong text contrast.

## Add compartments and nodes

1. Add a large rounded rectangle for the cell or system boundary.
2. Send it to the back and lock it.
3. Open Illustrations and insert the main biological or environmental objects.
4. Add rounded rectangles for concepts that do not need artwork.
5. Put the nodes in approximate left-to-right order.
6. Add short labels.

## Connect and align

1. Choose an anchored connector.
2. Connect the nodes in order.
3. Use arrowheads for direction.
4. Use a different line ending or style for inhibition.
5. Move two nodes to confirm that connectors follow them.
6. Align the main nodes and distribute them horizontally.

## Add a legend and accessibility text

Explain activation, inhibition, compartments, colors, and abbreviations.

Add alt text describing the pathway direction and a long description listing the major stages.

## Check and export

1. Run contrast and small-text checks.
2. Check for broken connectors.
3. Download a `.figureloom` backup.
4. Choose **Editable SVG (per page)**.
5. Open the SVG in another browser or vector editor.

# Tutorial 2: Build a scientific poster

## Choose the final size first

1. Create a new project.
2. Choose A0, A1, or the exact custom printer dimensions.
3. Choose portrait or landscape.
4. Confirm the printer's bleed and margin requirements separately.

## Build the layout

1. Turn on the physical grid.
2. Set margins using guides or locked background objects.
3. Choose two, three, or four content columns.
4. Add equal-width section frames.
5. Lock the frames after alignment.

## Add the header and sections

Include the title, author names, affiliations, contact information, and permitted logos.

Create one reusable section header and use it for Introduction, Methods, Results, Discussion, and References.

## Add figures, charts, and body text

- Import validated images.
- Add scale bars from source calibration.
- Create editable charts from prepared data.
- Use consistent panel labels.
- Keep chart and body text readable at the physical poster size.

## Accessibility and export

1. Preview in grayscale and common color-vision modes.
2. Check contrast and small text.
3. Download a project backup.
4. Export an SVG with **Print page dimensions** enabled.
5. Open the SVG in another application and confirm the physical size.
6. Convert the checked SVG elsewhere when the printer requires PDF or a raster format.

# Tutorial 3: Make a chart from spreadsheet data

## Prepare the data

Use a clean table with one header row and numeric values without units inside numeric cells.

```text
Group	Mean	SD
Control	4.2	0.8
Treatment A	6.1	1.0
Treatment B	7.4	0.9
```

## Insert and edit the chart

1. Copy the spreadsheet cells.
2. Open Data or Add chart.
3. Paste the table.
4. Confirm the delimiter and headers.
5. Choose a chart type.
6. Add axis labels, units, and a legend.
7. Double-click the chart later to reopen its source data.

Calculate and validate statistics outside FigureLoom.

## Export

Download the project backup and export the active page as editable SVG. Inspect axes, labels, and thin lines in the final file.

# Tutorial 4: Prepare a multi-panel journal figure

## Set the page size

1. Check the current journal instructions.
2. Choose a generic single-column or double-column preset close to the required size.
3. Enter exact custom dimensions when necessary.
4. Choose the required background.

## Create panel frames

1. Add equal rectangles for the panel layout.
2. Align rows and columns.
3. Distribute spacing equally.
4. Lock the frames or use them as temporary guides.

## Insert and standardize content

- Add images, charts, diagrams, or tables.
- Add consistent panel labels.
- Use one typography system.
- Use one accessible palette.
- Add alt text, a long description, references, and source notes.

## Run checks and export

1. Resolve off-canvas objects, small text, missing alt text, broken connectors, unresolved comments, and incomplete references.
2. Create a named checkpoint called `Submission layout`.
3. Download a project backup.
4. Export editable SVG.
5. Convert the checked SVG elsewhere when the journal requires PDF, TIFF, PNG, or another raster format.

# Tutorial 5: Build a microscopy figure

## Prepare source images

Complete scientific image processing in the correct analysis software. Keep raw data, processing steps, and calibration outside FigureLoom.

Export panel images with consistent dimensions and color handling.

## Create the layout

1. Choose a page size.
2. Use the microscopy starter or create a grid manually.
3. Import each channel or condition image.
4. Set equal image dimensions.
5. Align and distribute the images.

## Add labels and scale bars

Include channel names, conditions, time or dose, merged-image labels, and panel letters.

Use calibration from the source image software for scale bars. FigureLoom does not infer scientific scale automatically.

## Validate and export

Confirm that aspect ratios are unchanged, crops are appropriate, processing is comparable, and scale bars remain correct.

Export SVG with embedded raster images and inspect it at the intended size. Convert it elsewhere when the journal requires another format.

# Tutorial 6: Make a study-site locator map

## Prepare location information

Collect verified coordinates and the required geographic extent. Do not expose sensitive ecological, archaeological, or participant locations without approval.

## Create the map

1. Open Map Studio.
2. Choose world, regional, or country view.
3. Set land, border, and water styling.
4. Add each verified site.
5. Use short labels and a legend.
6. Add an inset when a small study area needs a broader locator.
7. Import GeoJSON when a boundary or region is needed.

## Validate

Check coordinates, boundary version, labels, political-context requirements, and source attribution.

# Tutorial 7: Review and collaborate on a shared project

## Owner setup

1. Sign in.
2. Open the local project.
3. Download a backup.
4. Save an encrypted cloud copy.
5. Create a named checkpoint.

## Invite an account reviewer

1. Open collaboration controls.
2. Enter the reviewer's exact email.
3. Choose Reviewer.
4. Send the FigureLoom link separately when needed.

The reviewer signs in with the invited email and adds comments without editing.

## Invite a guest reviewer

1. Choose Reviewer as the guest role.
2. Choose an expiry.
3. Add an optional 4 to 12 digit PIN.
4. Press **Create link**.
5. Send the link and PIN through an appropriate channel.

The guest opens the link, enters a display name, and does not need an email account.

## Editor workflow

1. Create a checkpoint before applying changes.
2. Work through comments.
3. Resolve each addressed comment.
4. Pause when a remote update warning appears.
5. Choose Apply remote update or Keep mine deliberately.

## Final owner review

1. Review remaining comments.
2. Compare with the checkpoint.
3. Run readiness checks.
4. Revoke unused guest links.
5. Download the final project backup.
6. Export the final SVG files.

# Tutorial 8: Use MCP with an external assistant

## Prepare the project

1. Sign in.
2. Open the exact cloud project the assistant should use.
3. Download a backup.
4. Open **Settings → MCP & AI access**.

## Connect safely

1. Choose Read-only when the client only needs context.
2. Choose Full editor access only when it must make changes.
3. Leave destructive actions off unless deletion is intentional.
4. Press **Connect FigureLoom**.
5. Copy the private MCP connection link into a compatible client.

## Work with the assistant

Ask the client to list the available FigureLoom commands first. Keep the matching project tab open while commands are running.

Successful write commands use the normal history and saving paths. Review the canvas, save indicator, and Undo history after a sequence of edits.

## Finish the session

1. Download a fresh project backup.
2. Review every assistant-made change.
3. Revoke the MCP connection.
4. Remove destructive permission when it is no longer needed.

# Tutorial 9: Recover or move a project

## Move to another device

1. Download the `.figureloom` project on the original device.
2. Transfer the file using a trusted method.
3. Open FigureLoom on the destination device.
4. Import the project.
5. Confirm pages, objects, fonts, images, charts, and comments.
6. Download a fresh backup from the destination device.

## Recover after a crash

1. Stop editing.
2. Open Projects and Recovery.
3. Compare the latest normal copy with recovery snapshots.
4. Restore the newest known-good snapshot into a separate project.
5. Save the recovered project under a new name.
6. Download a fresh backup.

# Final habit

For every important project, keep the editable `.figureloom` backup and the final checked SVG output. Browser autosave is useful, but neither browser storage nor a visual export should be the only copy.
