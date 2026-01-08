package ru.smirnovjavadev.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.exception.ResourceNotFoundException;
import ru.smirnovjavadev.repository.HouseholdRepository;
import ru.smirnovjavadev.repository.MemberRepository;

import java.util.List;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final HouseholdRepository householdRepository;
    private final Logger log = LoggerFactory.getLogger(MemberService.class);


    public MemberService(MemberRepository memberRepository, HouseholdRepository householdRepository) {
        this.memberRepository = memberRepository;
        this.householdRepository = householdRepository;
    }

    @Transactional(readOnly = true)
    public Member getById(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member", "id", id));
    }

    @Transactional
    public Member create(Long householdId, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException("Household", "id", householdId));

        // проверяем дубликаты в household
        if (memberRepository.existsByHouseholdIdAndName(householdId, name)) {
            throw new IllegalArgumentException("Member with this name already exists in household");
        }

        Member member = Member.builder()
                .name(name)
                .household(household)
                .build();

        return memberRepository.save(member);
    }

    @Transactional
    public void delete(Long id) {
        log.debug("Deleting member with id={}", id);

        if (id == null) {
            throw new IllegalArgumentException("Member id cannot be null");
        }

        if (!memberRepository.existsById(id)) {
            throw new ResourceNotFoundException("Member", "id", id);
        }

        try {
            memberRepository.deleteById(id);
            log.info("Deleted member id={}", id);
        } catch (Exception ex) {
            log.error("Error deleting member id={}", id, ex);
            throw ex;
        }
    }


    @Transactional(readOnly = true)
    public List<Member> getAll() {
        return memberRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Member> getAllByHousehold(Long householdId) {
        return memberRepository.findAllByHouseholdIdOrderByNameAsc(householdId);
    }
}