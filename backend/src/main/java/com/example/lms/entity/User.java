package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String name;

  @Column(unique = true, nullable = false)
  public String email;

  @com.fasterxml.jackson.annotation.JsonIgnore
  public String passwordHash;

  public String role = "STUDENT";

  @ManyToOne
  public Role roleDefinition;

  public String phone;
  public String bio;
  public String provider = "LOCAL";
}
