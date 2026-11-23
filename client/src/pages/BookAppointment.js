import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const BookAppointment = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const preselectedDoctor = location.state?.doctor || null;
    const fileInputRef = useRef(null);

    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(preselectedDoctor);
    const [date, setDate] = useState("");
    const [docFile, setDocFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (user?.isDoctor) {
            navigate("/doctor-appointments", { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!preselectedDoctor) {
            api.get("/doctors/get-all-doctors").then(({ data }) => {
                setDoctors(data.filter((d) => d.status === "approved"));
            });
        }
    }, [preselectedDoctor]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError("File is too large. Please select a document under 10MB.");
                setDocFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            setDocFile(file);
            setError("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDoctor) { setError("Please select a doctor."); return; }
        if (!date) { setError("Please select an appointment date."); return; }
        setLoading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("userId", user._id);
            formData.append("doctorId", selectedDoctor._id);
            formData.append("date", date);
            if (docFile) formData.append("document", docFile);

            const { data } = await api.post("/appointments/book-appointment", formData);

            if (typeof data === "string" && data.toLowerCase().includes("success")) {
                setSuccess("🎉 Appointment booked successfully! You'll be notified once confirmed.");
                setTimeout(() => navigate("/appointments"), 2500);
            } else {
                setError(typeof data === "string" ? data : "Booking failed.");
            }
        } catch (err) {
            const errorMsg = err.response?.data;
            setError(typeof errorMsg === "string" ? errorMsg : "Booking failed. Please try again.");
        }
        setLoading(false);
    };

    const getInitials = (name = "") =>
        name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

    const today = new Date().toISOString().split("T")[0];

    return (
        <Layout>
            <div className="page-header">
                <h1>📅 Book an Appointment</h1>
                <p>Select a doctor and your preferred date to book your appointment.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selectedDoctor ? "1fr 1fr" : "1fr", gap: "24px", alignItems: "start", maxWidth: selectedDoctor ? "100%" : "600px" }}>
                {/* FORM */}
                <div className="card">
                    {success && <div className="alert alert-success">{success}</div>}
                    {error && <div className="alert alert-error">⚠️ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        {/* DOCTOR SELECT */}
                        {preselectedDoctor ? (
                            <div className="form-group">
                                <label>Selected Doctor</label>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "12px",
                                    padding: "12px 14px", border: "1.5px solid var(--primary)",
                                    borderRadius: "var(--radius-sm)", background: "var(--primary-light)"
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: "50%",
                                        background: "var(--primary)", color: "white",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 700
                                    }}>
                                        {getInitials(preselectedDoctor.fullname)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>
                                            Dr. {preselectedDoctor.fullname}
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                            {preselectedDoctor.specialization} · ₹{preselectedDoctor.fees}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        style={{ marginLeft: "auto" }}
                                        onClick={() => { setSelectedDoctor(null); navigate("/book-appointment"); }}
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="doctor-select">Select Doctor *</label>
                                <select
                                    id="doctor-select"
                                    className="form-control"
                                    value={selectedDoctor?._id || ""}
                                    onChange={(e) => {
                                        const doc = doctors.find((d) => d._id === e.target.value);
                                        setSelectedDoctor(doc || null);
                                    }}
                                >
                                    <option value="">-- Choose a doctor --</option>
                                    {doctors.map((d) => (
                                        <option key={d._id} value={d._id}>
                                            Dr. {d.fullname} – {d.specialization} (₹{d.fees})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* DATE */}
                        <div className="form-group">
                            <label htmlFor="appt-date">Appointment Date *</label>
                            <input
                                id="appt-date"
                                className="form-control"
                                type="date"
                                value={date}
                                min={today}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        {/* DOCUMENT UPLOAD */}
                        <div className="form-group">
                            <label>Upload Document (optional)</label>
                            <div
                                className="upload-area"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="upload-icon">📎</div>
                                <p>Click to upload medical records, insurance (PDF, JPG, PNG, DOCX up to 10MB)</p>
                                {docFile && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "6px 12px", background: "var(--primary-light)", borderRadius: "var(--radius-sm)" }}>
                                        <div className="file-name" style={{ margin: 0, fontWeight: 600, color: "var(--primary)" }}>
                                            📄 {docFile.name} ({(docFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            style={{ padding: "2px 8px", fontSize: "0.75rem", lineHeight: 1 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDocFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    id="doc-upload"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleFileChange}
                                    style={{ display: "none" }}
                                />
                            </div>
                        </div>

                        <button
                            id="submit-booking"
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? "Booking…" : "📅 Confirm Appointment"}
                        </button>
                    </form>
                </div>

                {/* DOCTOR SUMMARY */}
                {selectedDoctor && (
                    <div className="card slide-up">
                        <div className="card-title">Doctor Details</div>
                        <div className="card-subtitle">Review before confirming</div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: "50%",
                                    background: "linear-gradient(135deg, var(--primary-light), #dbeafe)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "1.6rem", fontWeight: 700, color: "var(--primary)",
                                    border: "3px solid white", boxShadow: "0 0 0 3px var(--primary-light)"
                                }}>
                                    {getInitials(selectedDoctor.fullname)}
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "var(--dark)" }}>
                                        Dr. {selectedDoctor.fullname}
                                    </h3>
                                    <div className="spec-badge" style={{ marginTop: 4 }}>
                                        🩺 {selectedDoctor.specialization}
                                    </div>
                                </div>
                            </div>

                            <div className="divider" />

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {[
                                    { icon: "🏅", label: "Experience", value: selectedDoctor.experience ? `${selectedDoctor.experience} years` : null },
                                    { icon: "📍", label: "Location", value: selectedDoctor.address },
                                    { icon: "📞", label: "Phone", value: selectedDoctor.phone },
                                    { icon: "💰", label: "Consultation Fee", value: `₹${selectedDoctor.fees}` },
                                ].map(({ icon, label, value }) =>
                                    value ? (
                                        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                                            <span style={{ color: "var(--text-muted)" }}>{icon} {label}</span>
                                            <span style={{ fontWeight: 600, color: "var(--dark)" }}>{value}</span>
                                        </div>
                                    ) : null
                                )}
                                {selectedDoctor.timings?.length > 0 && (
                                    <div>
                                        <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>🕐 Timings</span>
                                        <div className="timing-chips" style={{ marginTop: 6 }}>
                                            {selectedDoctor.timings.map((t, i) => (
                                                <span key={i} className="timing-chip">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {date && (
                                <>
                                    <div className="divider" />
                                    <div style={{
                                        background: "var(--primary-light)", borderRadius: "var(--radius-sm)",
                                        padding: "14px", textAlign: "center"
                                    }}>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>
                                            Your appointment date
                                        </div>
                                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>
                                            📅 {new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
                                                weekday: "long", year: "numeric", month: "long", day: "numeric"
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default BookAppointment;
