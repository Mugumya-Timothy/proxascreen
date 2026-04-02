package handlers

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"

	"github.com/proxascreen/backend/internal/middleware"
	"github.com/proxascreen/backend/internal/services"
)

type BulkImportHandler struct {
	patientService    *services.PatientService
	assessmentService *services.AssessmentService
}

func NewBulkImportHandler(
	patientService *services.PatientService,
	assessmentService *services.AssessmentService,
) *BulkImportHandler {
	return &BulkImportHandler{
		patientService:    patientService,
		assessmentService: assessmentService,
	}
}

type importResult struct {
	Row           int    `json:"row"`
	PatientNumber string `json:"patient_number,omitempty"`
	RiskLevel     string `json:"risk_level,omitempty"`
	Error         string `json:"error,omitempty"`
}

// BulkImportPatients accepts a multipart CSV or XLSX file.
// Expected columns (case-insensitive, order flexible via header row):
//
//	full_name, age, date_of_submission, bmi, smoker, diet_type,
//	physical_activity_level, family_history, regular_health_checkup, prostate_exam_done
func (h *BulkImportHandler) BulkImportPatients(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file field required"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))

	var rows [][]string
	switch ext {
	case ".csv":
		rows, err = parseCSV(file)
	case ".xlsx", ".xls":
		rows, err = parseExcel(file, header.Size)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported file type; use .csv or .xlsx"})
		return
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("parse file: %v", err)})
		return
	}
	if len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file must have a header row and at least one data row"})
		return
	}

	// Build column index map from header row.
	colIdx, err := buildColIndex(rows[0])
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	clerkID, _ := c.Get(middleware.ContextKeyClerkID)

	var results []importResult
	for i, row := range rows[1:] {
		rowNum := i + 2 // 1-indexed, skipping header
		result, err := h.processRow(c, row, colIdx, clerkID.(string))
		if err != nil {
			results = append(results, importResult{Row: rowNum, Error: err.Error()})
			continue
		}
		result.Row = rowNum
		results = append(results, *result)
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

func (h *BulkImportHandler) processRow(
	c *gin.Context,
	row []string,
	colIdx map[string]int,
	clerkID string,
) (*importResult, error) {
	get := func(col string) string {
		idx, ok := colIdx[col]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	fullName := get("full_name")
	if fullName == "" {
		return nil, fmt.Errorf("full_name is required")
	}

	age, err := strconv.Atoi(get("age"))
	if err != nil || age <= 0 {
		return nil, fmt.Errorf("invalid age %q", get("age"))
	}

	ageF, err := strconv.ParseFloat(get("age"), 64)
	if err != nil {
		return nil, fmt.Errorf("invalid age %q", get("age"))
	}

	bmi, err := strconv.ParseFloat(get("bmi"), 64)
	if err != nil || bmi <= 0 {
		return nil, fmt.Errorf("invalid bmi %q", get("bmi"))
	}

	smoker := parseBool(get("smoker"))
	familyHistory := parseBool(get("family_history"))
	regularCheckup := parseBool(get("regular_health_checkup"))
	prostateExam := parseBool(get("prostate_exam_done"))

	dietType := strings.ToLower(get("diet_type"))
	if dietType != "fatty" && dietType != "mixed" && dietType != "healthy" {
		return nil, fmt.Errorf("invalid diet_type %q; must be fatty, mixed, or healthy", get("diet_type"))
	}

	pal := strings.ToLower(get("physical_activity_level"))
	if pal != "low" && pal != "moderate" && pal != "high" {
		return nil, fmt.Errorf("invalid physical_activity_level %q; must be low, moderate, or high", get("physical_activity_level"))
	}

	dos := get("date_of_submission")
	if dos != "" {
		if _, err := time.Parse("2006-01-02", dos); err != nil {
			return nil, fmt.Errorf("invalid date_of_submission %q; expected YYYY-MM-DD", dos)
		}
	}

	// Create patient.
	patient, err := h.patientService.CreatePatient(c.Request.Context(), services.CreatePatientParams{
		FullName:         fullName,
		Age:              age,
		DateOfSubmission: dos,
		CreatedByClerkID: clerkID,
	})
	if err != nil {
		return nil, fmt.Errorf("create patient: %w", err)
	}

	// Create assessment (calls model service).
	assessment, err := h.assessmentService.CreateAssessment(c.Request.Context(), services.CreateAssessmentParams{
		PatientID:             patient.ID,
		ClinicianClerkID:      clerkID,
		Age:                   ageF,
		BMI:                   bmi,
		Smoker:                smoker,
		DietType:              dietType,
		PhysicalActivityLevel: pal,
		FamilyHistory:         familyHistory,
		RegularHealthCheckup:  regularCheckup,
		ProstateExamDone:      prostateExam,
	})
	if err != nil {
		return nil, fmt.Errorf("create assessment: %w", err)
	}

	return &importResult{
		PatientNumber: patient.PatientNumber,
		RiskLevel:     assessment.RiskLevel,
	}, nil
}

// ── File parsers ──────────────────────────────────────────────────────────────

func parseCSV(r io.Reader) ([][]string, error) {
	return csv.NewReader(r).ReadAll()
}

func parseExcel(r io.Reader, size int64) ([][]string, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("no sheets found")
	}
	return f.GetRows(sheets[0])
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// buildColIndex maps lowercase column names to their 0-based index.
func buildColIndex(header []string) (map[string]int, error) {
	required := []string{
		"full_name", "age", "bmi", "diet_type", "physical_activity_level",
	}
	idx := make(map[string]int, len(header))
	for i, h := range header {
		idx[strings.ToLower(strings.TrimSpace(h))] = i
	}
	for _, col := range required {
		if _, ok := idx[col]; !ok {
			return nil, fmt.Errorf("missing required column %q in header", col)
		}
	}
	return idx, nil
}

func parseBool(s string) bool {
	s = strings.ToLower(strings.TrimSpace(s))
	return s == "true" || s == "yes" || s == "1"
}
